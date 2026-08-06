# ============================================================================
# Invitation and Notification views.
# ============================================================================
import logging

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from .models import ClientInvitation, Notification, Client, UserProfile, OnboardingStep
from .social_auth_views import _make_jwt
from .welcome_email_service import save_welcome_template, template_api_payload
from .client_invitation_service import (
    create_and_send_invitation,
    accept_invitation_by_token,
)

logger = logging.getLogger(__name__)


def _staff_only(profile):
    return profile and profile.role in ('superadmin', 'staff')


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def welcome_email_template(request):
    profile = getattr(request.user, 'profile', None)
    if not _staff_only(profile):
        return Response({'error': 'Only agency users can manage welcome email templates.'}, status=403)

    if request.method == 'GET':
        return Response(template_api_payload())

    payload = request.data.get('template')
    if not isinstance(payload, dict):
        payload = request.data
    if not isinstance(payload, dict):
        return Response({'error': 'template object required.'}, status=400)

    save_welcome_template(payload)
    return Response(template_api_payload())


# Backward-compatible alias
invitation_email_template = welcome_email_template


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_invitation(request):
    profile = getattr(request.user, 'profile', None)
    if not _staff_only(profile):
        return Response({'error': 'Only agency users can send invitations.'}, status=403)

    client_email = (request.data.get('client_email') or '').strip().lower()
    message = request.data.get('message', '')
    if not client_email:
        return Response({'error': 'client_email is required.'}, status=400)

    existing = ClientInvitation.objects.filter(
        invited_by=request.user,
        client_email=client_email,
        status='pending',
    ).first()
    if existing and not existing.is_expired:
        return Response({'error': 'A pending invitation already exists for this email.'}, status=400)

    invitation, err, log_id = create_and_send_invitation(
        invited_by=request.user,
        client_email=client_email,
        message=message,
        request=request,
    )
    if not invitation:
        return Response({
            'error': err or 'Invitation email could not be sent.',
            'error_log_id': str(log_id) if log_id else None,
            'email_sent': False,
        }, status=502)

    return Response({
        'id': invitation.id,
        'token': str(invitation.token),
        'status': invitation.status,
        'client_email': invitation.client_email,
        'email_sent': True,
        'expires_at': invitation.expires_at,
    }, status=201)


def _invitation_payload(inv):
    agency = inv.invited_by
    return {
        'token': str(inv.token),
        'agency_name': agency.get_full_name() or agency.email,
        'agency_email': agency.email,
        'client_email': inv.client_email,
        'message': inv.message,
        'status': 'expired' if inv.is_expired else inv.status,
        'is_expired': inv.is_expired,
        'expires_at': inv.expires_at,
        'invited_at': inv.invited_at,
        'token_used': bool(inv.token_used_at),
    }


@api_view(['GET'])
@permission_classes([AllowAny])
def get_invitation(request, token):
    try:
        inv = ClientInvitation.objects.select_related('invited_by').get(token=token)
    except ClientInvitation.DoesNotExist:
        return Response({'error': 'Invitation not found.'}, status=404)
    return Response(_invitation_payload(inv))


@api_view(['POST'])
@permission_classes([AllowAny])
def accept_invitation_magic(request, token):
    try:
        data = accept_invitation_by_token(token, request=request)
        return Response(data)
    except ValueError as exc:
        msg = str(exc)
        code = 410 if 'expired' in msg.lower() else 400
        return Response({'error': msg}, status=code)
    except Exception as exc:
        logger.exception('accept_invitation_magic failed for token=%s', token)
        return Response({'error': 'Could not accept invitation. Please try again or ask for a new invite.'}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def respond_invitation(request, token):
    try:
        inv = ClientInvitation.objects.select_related('invited_by', 'client_record').get(token=token)
    except ClientInvitation.DoesNotExist:
        return Response({'error': 'Invitation not found.'}, status=404)

    if request.user.email.lower() != inv.client_email.lower():
        return Response({'error': 'This invitation is not for your email address.'}, status=403)

    action = request.data.get('action')
    if action != 'accept':
        if action != 'reject':
            return Response({'error': 'action must be accept or reject.'}, status=400)
        if inv.status != 'pending':
            return Response({'error': f'Invitation already {inv.status}.'}, status=400)
        inv.status = 'rejected'
        inv.responded_at = timezone.now()
        inv.save(update_fields=['status', 'responded_at'])
        from .notification_dispatcher import dispatch as _dispatch
        _dispatch(
            inv.invited_by,
            event_type='invitation_rejected',
            notif_type='invitation_rejected',
            title=f'{request.user.get_full_name() or request.user.email} rejected your invitation',
            data={'client_email': inv.client_email},
        )
        return Response({'status': 'rejected'})

    try:
        data = accept_invitation_by_token(token, request=request)
        return Response(data)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_invitations(request):
    profile = getattr(request.user, 'profile', None)

    if profile and profile.role in ('superadmin', 'staff'):
        invs = ClientInvitation.objects.filter(invited_by=request.user).select_related('client_record')
        data = []
        for inv in invs:
            data.append({
                'id': inv.id,
                'token': str(inv.token),
                'client_email': inv.client_email,
                'client_name': inv.client_record.company if inv.client_record else None,
                'client_id': inv.client_record.id if inv.client_record else None,
                'status': 'expired' if inv.is_expired else inv.status,
                'is_expired': inv.is_expired,
                'message': inv.message,
                'invited_at': inv.invited_at,
                'responded_at': inv.responded_at,
            })
        return Response(data)

    invs = ClientInvitation.objects.filter(
        client_email__iexact=request.user.email
    ).select_related('invited_by')
    data = []
    for inv in invs:
        agency = inv.invited_by
        data.append({
            'id': inv.id,
            'token': str(inv.token),
            'agency_name': agency.get_full_name() or agency.email,
            'agency_email': agency.email,
            'message': inv.message,
            'status': 'expired' if inv.is_expired else inv.status,
            'is_expired': inv.is_expired,
            'invited_at': inv.invited_at,
        })
    return Response(data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def cancel_invitation(request, pk):
    profile = getattr(request.user, 'profile', None)
    if not _staff_only(profile):
        return Response({'error': 'Only agency users can cancel invitations.'}, status=403)

    try:
        inv = ClientInvitation.objects.get(pk=pk, invited_by=request.user)
    except ClientInvitation.DoesNotExist:
        return Response({'error': 'Invitation not found.'}, status=404)

    if inv.status != 'pending':
        return Response({'error': 'Only pending invitations can be cancelled.'}, status=400)

    inv.status = 'cancelled'
    inv.save(update_fields=['status'])

    if inv.client_user:
        agency_name = request.user.get_full_name() or request.user.email
        from .notification_dispatcher import dispatch as _dispatch
        _dispatch(
            inv.client_user,
            event_type='invitation_cancelled',
            notif_type='invitation_cancelled',
            title=f'{agency_name} cancelled their invitation',
            data={'agency_email': request.user.email},
        )

    return Response({'status': 'cancelled'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_notifications(request):
    notifs = Notification.objects.filter(user=request.user)[:50]
    data = [{
        'id': n.id,
        'notif_type': n.notif_type,
        'title': n.title,
        'body': n.body,
        'data': n.data,
        'is_read': n.is_read,
        'created_at': n.created_at,
    } for n in notifs]
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_read(request, pk):
    updated = Notification.objects.filter(pk=pk, user=request.user).update(is_read=True)
    if not updated:
        return Response({'error': 'Not found.'}, status=404)
    return Response({'status': 'ok'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'status': 'ok'})
