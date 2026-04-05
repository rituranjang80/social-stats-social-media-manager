"""
Invitation and Notification views.
Agency users invite clients; clients accept/reject.
"""
import uuid
from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from .models import ClientInvitation, Notification, Client, UserProfile, OnboardingStep
from .social_auth_views import _make_jwt

FRONTEND_URL = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')


def _send_invitation_email(invitation, client_user):
    """Send invitation email to client."""
    agency_name = invitation.invited_by.get_full_name() or invitation.invited_by.email
    if client_user:
        link = f"{FRONTEND_URL}/invitation/{invitation.token}"
        subject = f"{agency_name} wants to manage your Xperso account"
        body = (
            f"Hi,\n\n"
            f"{agency_name} has invited you to let them manage your social media analytics on Xperso.\n\n"
            f"Message: {invitation.message}\n\n"
            f"Accept or reject here: {link}\n\n"
            f"This invitation expires in 7 days.\n"
        )
    else:
        link = f"{FRONTEND_URL}/signup?invite={invitation.token}"
        subject = f"You've been invited to Xperso by {agency_name}"
        body = (
            f"Hi,\n\n"
            f"{agency_name} has invited you to join Xperso for social media analytics.\n\n"
            f"Message: {invitation.message}\n\n"
            f"Sign up here: {link}\n\n"
            f"This invitation expires in 7 days.\n"
        )
    try:
        send_mail(
            subject, body,
            getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@statox.ai'),
            [invitation.client_email],
            fail_silently=True,
        )
    except Exception:
        pass


def _ensure_onboarding(client):
    """Create OnboardingStep records for a client if missing."""
    STEP_KEYS = [
        'connect_platform', 'sync_data', 'set_goals',
        'add_competitor', 'view_analytics', 'share_report',
    ]
    for step_key in STEP_KEYS:
        OnboardingStep.objects.get_or_create(client=client, step_key=step_key)


# ── Send Invitation ────────────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_invitation(request):
    """Agency sends an invitation to a client email."""
    profile = getattr(request.user, 'profile', None)
    if not profile or profile.role not in ('superadmin', 'staff'):
        return Response({'error': 'Only agency users can send invitations.'}, status=403)

    client_email = (request.data.get('client_email') or '').strip().lower()
    message      = request.data.get('message', '')

    if not client_email:
        return Response({'error': 'client_email is required.'}, status=400)

    # No duplicate pending invite from same agency to same email
    existing = ClientInvitation.objects.filter(
        invited_by=request.user,
        client_email=client_email,
        status='pending',
    ).first()
    if existing and not existing.is_expired:
        return Response({'error': 'A pending invitation already exists for this email.'}, status=400)

    # Find client user if they already have an account
    client_user = User.objects.filter(email__iexact=client_email).first()

    # Find or create a Client placeholder record
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

    # Notify existing user
    if client_user:
        agency_name = request.user.get_full_name() or request.user.email
        Notification.objects.create(
            user=client_user,
            notif_type='invitation_received',
            title=f"{agency_name} wants to manage your account",
            body=message,
            data={
                'token':       str(invitation.token),
                'agency_name': agency_name,
                'agency_email': request.user.email,
            },
        )

    _send_invitation_email(invitation, client_user)

    return Response({
        'id':           invitation.id,
        'token':        str(invitation.token),
        'status':       invitation.status,
        'client_email': invitation.client_email,
        'client_found': client_user is not None,
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

        # Link profile to client and agency
        profile = request.user.profile
        profile.client = inv.client_record
        profile.agency = inv.invited_by
        profile.save(update_fields=['client', 'agency'])

        _ensure_onboarding(inv.client_record)

        # Mark related notifications as read
        Notification.objects.filter(
            user=request.user,
            data__token=str(inv.token),
        ).update(is_read=True)

        # Notify agency
        Notification.objects.create(
            user=inv.invited_by,
            notif_type='invitation_accepted',
            title=f"{request.user.get_full_name() or request.user.email} accepted your invitation",
            data={
                'client_id':    inv.client_record.id if inv.client_record else None,
                'client_email': inv.client_email,
            },
        )

        access, refresh = _make_jwt(request.user)
        return Response({
            'status':    'accepted',
            'access':    access,
            'refresh':   refresh,
            'client_id': inv.client_record.id if inv.client_record else None,
        })

    else:  # reject
        inv.status = 'rejected'
        inv.save()

        Notification.objects.create(
            user=inv.invited_by,
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
        # Agency: invitations I sent
        invs = ClientInvitation.objects.filter(invited_by=request.user).select_related('client_record')
        data = []
        for inv in invs:
            data.append({
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
            })
        return Response(data)

    else:
        # Client: invitations sent to my email
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
    if not profile or profile.role not in ('superadmin', 'staff'):
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
        Notification.objects.create(
            user=inv.client_user,
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


# ── Mark Notification Read ────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_read(request, pk):
    updated = Notification.objects.filter(pk=pk, user=request.user).update(is_read=True)
    if not updated:
        return Response({'error': 'Not found.'}, status=404)
    return Response({'status': 'ok'})


# ── Mark All Notifications Read ───────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'status': 'ok'})
