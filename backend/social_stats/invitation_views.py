# ============================================================================
# Invitation and Notification views.
# Agency users invite clients; clients accept/reject.
# ============================================================================
import logging
import uuid

from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.crypto import get_random_string
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from .models import ClientInvitation, Notification, Client, UserProfile, OnboardingStep
from .social_auth_views import _make_jwt
from .client_invitation_email import (
    build_invitation_email,
    save_invitation_template,
    template_api_payload,
)

logger = logging.getLogger(__name__)

FRONTEND_URL = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
FROM_EMAIL   = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@socialstats.app')


def _staff_only(profile):
    return profile and profile.role in ('superadmin', 'staff')


def _provision_invited_client_user(email, invited_by):
    """Create an active client account with a one-time temporary password."""
    existing = User.objects.filter(email__iexact=email).first()
    if existing:
        return existing, None

    local = email.split('@')[0].replace('.', ' ').replace('_', ' ').title()
    temp_password = get_random_string(
        14,
        'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789',
    )
    user = User.objects.create_user(
        username=email,
        email=email,
        password=temp_password,
        first_name=local.split(' ')[0] if local else 'Client',
        last_name=' '.join(local.split(' ')[1:]) if local and ' ' in local else '',
        is_active=True,
    )
    UserProfile.objects.create(
        user=user,
        role='client',
        email_verified=True,
        terms_accepted=True,
        terms_accepted_at=timezone.now(),
        agency=invited_by,
    )
    return user, temp_password


def _send_invitation_email(invitation, client_user, temp_password=None, *, request=None, invited_by_id=None):
    """
    Send invitation email. Returns (success, error_message, error_log_id).
    On failure, writes a row to ErrorLog (category client_invitation_email).
    """
    from .error_monitoring.services.error_logger import ErrorLogger

    subject, plain, html = build_invitation_email(
        invitation,
        client_user=client_user,
        temp_password=temp_password,
    )
    recipient = invitation.client_email
    try:
        sent = send_mail(
            subject,
            plain,
            FROM_EMAIL,
            [recipient],
            html_message=html,
            fail_silently=False,
        )
        if sent != 1:
            msg = (
                f'Email backend reported {sent} message(s) sent (expected 1) '
                f'to {recipient}.'
            )
            log_id = ErrorLogger.log_invitation_email_failure(
                message=msg,
                client_email=recipient,
                invitation_id=invitation.id,
                invited_by_id=invited_by_id,
                request=request,
                async_log=False,
            )
            return False, msg, log_id
        return True, '', None
    except Exception as exc:
        msg = f'Failed to send invitation email to {recipient}: {exc}'
        logger.exception('invitation email failed for %s', recipient)
        log_id = ErrorLogger.log_invitation_email_failure(
            message=msg,
            client_email=recipient,
            invitation_id=invitation.id,
            invited_by_id=invited_by_id,
            request=request,
            exception=exc,
            async_log=False,
        )
        return False, msg, log_id


def _ensure_onboarding(client):
    STEP_KEYS = [
        'connect_platform', 'sync_data', 'set_goals',
        'add_competitor', 'view_analytics', 'share_report',
    ]
    for step_key in STEP_KEYS:
        OnboardingStep.objects.get_or_create(client=client, step_key=step_key)


def _serialize_agency_invitation(inv):
    return {
        'id':           inv.id,
        'token':        str(inv.token),
        'client_email': inv.client_email,
        'client_name':  inv.client_record.company if inv.client_record else None,
        'client_id':    inv.client_record.id if inv.client_record else None,
        'status':       'expired' if inv.is_expired else inv.status,
        'is_expired':   inv.is_expired,
        'message':      inv.message,
        'invited_at':   inv.invited_at,
        'responded_at': inv.responded_at,
    }


# ── Email template (admin) ───────────────────────────────────────────────────

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def invitation_email_template(request):
    profile = getattr(request.user, 'profile', None)
    if not _staff_only(profile):
        return Response({'error': 'Only agency users can manage invitation templates.'}, status=403)

    if request.method == 'GET':
        return Response(template_api_payload())

    payload = request.data.get('template')
    if not isinstance(payload, dict):
        payload = request.data
    if not isinstance(payload, dict):
        return Response({'error': 'template object required.'}, status=400)

    save_invitation_template(payload)
    return Response(template_api_payload())


# ── Send Invitation ────────────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_invitation(request):
    """Agency sends an invitation to a client email."""
    profile = getattr(request.user, 'profile', None)
    if not _staff_only(profile):
        return Response({'error': 'Only agency users can send invitations.'}, status=403)

    client_email = (request.data.get('client_email') or '').strip().lower()
    message      = request.data.get('message', '')

    if not client_email:
        return Response({'error': 'client_email is required.'}, status=400)

    existing = ClientInvitation.objects.filter(
        invited_by=request.user,
        client_email=client_email,
        status='pending',
    ).first()
    if existing and not existing.is_expired:
        return Response({'error': 'A pending invitation already exists for this email.'}, status=400)

    client_user = User.objects.filter(email__iexact=client_email).first()
    temp_password = None
    provisioned_user = None
    if not client_user:
        client_user, temp_password = _provision_invited_client_user(client_email, request.user)
        provisioned_user = client_user

    client_record = Client.objects.filter(email__iexact=client_email).first()
    if not client_record:
        name = client_email.split('@')[0]
        client_record = Client.objects.create(
            name=name, company=name, email=client_email,
        )

    invitation = ClientInvitation.objects.create(
        invited_by=request.user,
        client_user=client_user,
        client_email=client_email,
        client_record=client_record,
        message=message,
    )

    email_ok, email_error, error_log_id = _send_invitation_email(
        invitation,
        client_user,
        temp_password=temp_password,
        request=request,
        invited_by_id=request.user.id,
    )

    if not email_ok:
        invitation.delete()
        if provisioned_user:
            provisioned_user.delete()
        return Response({
            'error': email_error or 'Invitation email could not be sent.',
            'error_log_id': str(error_log_id) if error_log_id else None,
            'email_sent': False,
        }, status=502)

    if client_user:
        agency_name = request.user.get_full_name() or request.user.email
        from .notification_dispatcher import dispatch as _dispatch
        _dispatch(
            client_user,
            event_type='invitation_received',
            notif_type='invitation_received',
            title=f"{agency_name} wants to manage your account",
            body=message,
            data={
                'token':       str(invitation.token),
                'agency_name': agency_name,
                'agency_email': request.user.email,
            },
        )

    return Response({
        'id':           invitation.id,
        'token':        str(invitation.token),
        'status':       invitation.status,
        'client_email': invitation.client_email,
        'client_found': client_user is not None and temp_password is None,
        'provisioned':  temp_password is not None,
        'email_sent':   True,
        'expires_at':   invitation.expires_at,
    }, status=201)


# ── Get Invitation by Token ────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([AllowAny])
def get_invitation(request, token):
    try:
        inv = ClientInvitation.objects.select_related('invited_by').get(token=token)
    except ClientInvitation.DoesNotExist:
        return Response({'error': 'Invitation not found.'}, status=404)

    agency = inv.invited_by
    return Response({
        'token':        str(inv.token),
        'agency_name':  agency.get_full_name() or agency.email,
        'agency_email': agency.email,
        'client_email': inv.client_email,
        'message':      inv.message,
        'status':       inv.status,
        'is_expired':   inv.is_expired,
        'expires_at':   inv.expires_at,
        'invited_at':   inv.invited_at,
    })


# ── Respond to Invitation ──────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def respond_invitation(request, token):
    try:
        inv = ClientInvitation.objects.select_related('invited_by', 'client_record').get(token=token)
    except ClientInvitation.DoesNotExist:
        return Response({'error': 'Invitation not found.'}, status=404)

    if inv.status != 'pending':
        return Response({'error': f'Invitation already {inv.status}.'}, status=400)

    if inv.is_expired:
        inv.status = 'expired'
        inv.save(update_fields=['status'])
        return Response({'error': 'Invitation has expired.'}, status=400)

    if request.user.email.lower() != inv.client_email.lower():
        return Response({'error': 'This invitation is not for your email address.'}, status=403)

    action = request.data.get('action')
    if action not in ('accept', 'reject'):
        return Response({'error': 'action must be accept or reject.'}, status=400)

    inv.responded_at = timezone.now()
    agency_name = inv.invited_by.get_full_name() or inv.invited_by.email

    if action == 'accept':
        inv.status = 'accepted'
        inv.save()

        profile = request.user.profile
        profile.client = inv.client_record
        profile.agency = inv.invited_by
        profile.save(update_fields=['client', 'agency'])

        _ensure_onboarding(inv.client_record)

        Notification.objects.filter(
            user=request.user,
            data__token=str(inv.token),
        ).update(is_read=True)

        from .notification_dispatcher import dispatch as _dispatch
        _dispatch(
            inv.invited_by,
            event_type='invitation_accepted',
            notif_type='invitation_accepted',
            title=f"{request.user.get_full_name() or request.user.email} accepted your invitation",
            data={
                'client_id':    inv.client_record.id if inv.client_record else None,
                'client_email': inv.client_email,
            },
        )

        try:
            from .profile_views import send_invitation_accepted_email
            send_invitation_accepted_email(request.user, agency_name, inv.invited_by.email)
        except Exception:
            pass

        access, refresh = _make_jwt(request.user)
        return Response({
            'status':    'accepted',
            'access':    access,
            'refresh':   refresh,
            'client_id': inv.client_record.id if inv.client_record else None,
        })

    inv.status = 'rejected'
    inv.save()

    from .notification_dispatcher import dispatch as _dispatch
    _dispatch(
        inv.invited_by,
        event_type='invitation_rejected',
        notif_type='invitation_rejected',
        title=f"{request.user.get_full_name() or request.user.email} rejected your invitation",
        data={'client_email': inv.client_email},
    )
    return Response({'status': 'rejected'})


# ── List My Invitations ────────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_invitations(request):
    profile = getattr(request.user, 'profile', None)

    if profile and profile.role in ('superadmin', 'staff'):
        invs = ClientInvitation.objects.filter(invited_by=request.user).select_related('client_record')
        return Response([_serialize_agency_invitation(inv) for inv in invs])

    invs = ClientInvitation.objects.filter(
        client_email__iexact=request.user.email
    ).select_related('invited_by')
    data = []
    for inv in invs:
        agency = inv.invited_by
        data.append({
            'id':           inv.id,
            'token':        str(inv.token),
            'agency_name':  agency.get_full_name() or agency.email,
            'agency_email': agency.email,
            'message':      inv.message,
            'status':       'expired' if inv.is_expired else inv.status,
            'is_expired':   inv.is_expired,
            'invited_at':   inv.invited_at,
        })
    return Response(data)


# ── Cancel Invitation ──────────────────────────────────────────────────────────
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
            title=f"{agency_name} cancelled their invitation",
            data={'agency_email': request.user.email},
        )

    return Response({'status': 'cancelled'})


# ── List Notifications ─────────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_notifications(request):
    notifs = Notification.objects.filter(user=request.user)[:50]
    data = [{
        'id':         n.id,
        'notif_type': n.notif_type,
        'title':      n.title,
        'body':       n.body,
        'data':       n.data,
        'is_read':    n.is_read,
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
