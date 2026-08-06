# ============================================================================
# Client invitation lifecycle — send, resend, magic accept (no password email).
# ============================================================================
from __future__ import annotations

import logging
import uuid

from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from .audit import log_action
from .models import Client, ClientInvitation, Notification, OnboardingStep, UserProfile
from .security import audit as security_audit
from .social_auth_views import _make_jwt
from .welcome_email_service import render_welcome_email

logger = logging.getLogger(__name__)

FROM_EMAIL = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@socialstats.app')
FRONTEND_URL = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')


def _client_ip(request):
    if not request:
        return None
    xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def _audit_client_action(request, client, event_type, *, details=None):
    meta = details or {}
    security_audit.record(
        event_type=event_type,
        actor_user=request.user if request else None,
        target_client=client,
        target_object_type='Client',
        target_object_id=str(client.id),
        request=request,
        metadata=meta,
    )
    log_action(
        request.user if request else None,
        client,
        event_type,
        object_type='Client',
        object_id=str(client.id),
        details={**(details or {}), 'ip': _client_ip(request)},
    )


def _ensure_onboarding(client):
    for step_key in (
        'connect_platform', 'sync_data', 'set_goals',
        'add_competitor', 'view_analytics', 'share_report',
    ):
        OnboardingStep.objects.get_or_create(client=client, step_key=step_key)


def _send_email(invitation, *, request=None, invited_by_id=None):
    from .error_monitoring.services.error_logger import ErrorLogger

    subject, plain, html_out = render_welcome_email(invitation)
    recipient = invitation.client_email
    try:
        sent = send_mail(subject, plain, FROM_EMAIL, [recipient], html_message=html_out, fail_silently=False)
        if sent != 1:
            msg = f'Email backend reported {sent} message(s) sent (expected 1) to {recipient}.'
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
        logger.exception(msg)
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


def _cancel_pending_invites(invited_by, client_email, exclude_id=None):
    qs = ClientInvitation.objects.filter(
        invited_by=invited_by,
        client_email__iexact=client_email,
        status='pending',
    )
    if exclude_id:
        qs = qs.exclude(pk=exclude_id)
    qs.update(status='cancelled')


@transaction.atomic
def create_and_send_invitation(*, invited_by, client_email, message='', client_record=None, request=None):
    client_email = client_email.strip().lower()
    client_user = User.objects.filter(email__iexact=client_email).first()

    if not client_record:
        client_record = Client.objects.filter(email__iexact=client_email, is_deleted=False).first()
    if not client_record:
        name = client_email.split('@')[0]
        client_record = Client.objects.create(name=name, company=name, email=client_email)

    _cancel_pending_invites(invited_by, client_email)

    invitation = ClientInvitation.objects.create(
        invited_by=invited_by,
        client_user=client_user,
        client_email=client_email,
        client_record=client_record,
        message=message,
    )

    ok, err, log_id = _send_email(invitation, request=request, invited_by_id=invited_by.id)
    if not ok:
        invitation.delete()
        return None, err, log_id

    client_record.last_invitation_sent_at = timezone.now()
    client_record.save(update_fields=['last_invitation_sent_at'])

    _audit_client_action(request, client_record, 'invitation.sent', details={
        'client_email': client_email,
        'invitation_id': invitation.id,
    })

    if client_user:
        agency_name = invited_by.get_full_name() or invited_by.email
        from .notification_dispatcher import dispatch as _dispatch
        _dispatch(
            client_user,
            event_type='invitation_received',
            notif_type='invitation_received',
            title=f'{agency_name} wants to manage your account',
            body=message,
            data={
                'token': str(invitation.token),
                'agency_name': agency_name,
                'agency_email': invited_by.email,
            },
        )

    return invitation, '', None


@transaction.atomic
def resend_invitation_for_client(*, client: Client, invited_by, request=None):
    if not client.email:
        return None, 'Client has no email address.', None

    _cancel_pending_invites(invited_by, client.email)
    client_user = User.objects.filter(email__iexact=client.email).first()

    invitation = ClientInvitation.objects.create(
        invited_by=invited_by,
        client_user=client_user,
        client_email=client.email,
        client_record=client,
        message='',
    )

    ok, err, log_id = _send_email(invitation, request=request, invited_by_id=invited_by.id)
    if not ok:
        invitation.delete()
        return None, err, log_id

    client.last_invitation_sent_at = timezone.now()
    client.save(update_fields=['last_invitation_sent_at'])

    _audit_client_action(request, client, 'invitation.resent', details={
        'client_email': client.email,
        'invitation_id': invitation.id,
    })
    return invitation, '', None


def _get_or_create_client_user(invitation: ClientInvitation) -> User:
    user = User.objects.filter(email__iexact=invitation.client_email).first()
    if user:
        profile, created = UserProfile.objects.get_or_create(
            user=user,
            defaults={
                'role': 'client',
                'email_verified': True,
                'terms_accepted': True,
                'terms_accepted_at': timezone.now(),
                'agency': invitation.invited_by,
            },
        )
        if not created and profile.role in ('superadmin', 'staff'):
            raise ValueError('This email belongs to a staff account and cannot accept a client invitation.')
        if not created and profile.role != 'client':
            profile.role = 'client'
            profile.save(update_fields=['role'])
        user.is_active = True
        user.save(update_fields=['is_active'])
        return user
    local = invitation.client_email.split('@')[0]
    user = User(
        username=invitation.client_email,
        email=invitation.client_email,
        first_name=local.replace('.', ' ').replace('_', ' ').title()[:30],
        is_active=True,
    )
    user.set_unusable_password()
    user.save()
    UserProfile.objects.create(
        user=user,
        role='client',
        email_verified=True,
        terms_accepted=True,
        terms_accepted_at=timezone.now(),
        agency=invitation.invited_by,
    )
    return user


@transaction.atomic
def accept_invitation_by_token(token, *, request=None):
    try:
        token_uuid = uuid.UUID(str(token))
    except ValueError as exc:
        raise ValueError('Invalid invitation token.') from exc

    try:
        inv = ClientInvitation.objects.select_related('invited_by', 'client_record').get(token=token_uuid)
    except ClientInvitation.DoesNotExist as exc:
        raise ValueError('Invitation not found.') from exc

    if inv.status == 'accepted' and inv.client_user_id:
        access, refresh = _make_jwt(inv.client_user)
        return {
            'status': 'accepted',
            'access': access,
            'refresh': refresh,
            'client_id': inv.client_record_id,
            'already_accepted': True,
        }

    if inv.status != 'pending':
        raise ValueError(f'Invitation already {inv.status}.')

    if inv.is_expired:
        inv.status = 'expired'
        inv.save(update_fields=['status'])
        raise ValueError('Invitation has expired.')

    if inv.token_used_at:
        raise ValueError('Invitation link has already been used.')

    user = _get_or_create_client_user(inv)
    profile = user.profile
    profile.client = inv.client_record
    profile.agency = inv.invited_by
    profile.email_verified = True
    profile.terms_accepted = True
    if not profile.terms_accepted_at:
        profile.terms_accepted_at = timezone.now()
    profile.save(update_fields=['client', 'agency', 'email_verified', 'terms_accepted', 'terms_accepted_at'])

    if inv.client_record and not inv.client_record.is_active:
        inv.client_record.is_active = True
        inv.client_record.save(update_fields=['is_active'])

    inv.status = 'accepted'
    inv.responded_at = timezone.now()
    inv.token_used_at = timezone.now()
    inv.client_user = user
    inv.save(update_fields=['status', 'responded_at', 'token_used_at', 'client_user'])

    if inv.client_record:
        _ensure_onboarding(inv.client_record)
        try:
            _audit_client_action(request, inv.client_record, 'invitation.accepted', details={
                'client_email': inv.client_email,
                'invitation_id': inv.id,
                'via': 'magic_link',
            })
        except Exception:
            logger.exception('Audit log failed for invitation.accepted')

    try:
        Notification.objects.filter(user=user, data__token=str(inv.token)).update(is_read=True)
    except Exception:
        pass

    try:
        from .notification_dispatcher import dispatch as _dispatch
        _dispatch(
            inv.invited_by,
            event_type='invitation_accepted',
            notif_type='invitation_accepted',
            title=f'{user.get_full_name() or user.email} accepted your invitation',
            data={
                'client_id': inv.client_record.id if inv.client_record else None,
                'client_email': inv.client_email,
            },
        )
    except Exception:
        logger.exception('Notification dispatch failed after invitation accept')

    access, refresh = _make_jwt(user)
    return {
        'status': 'accepted',
        'access': access,
        'refresh': refresh,
        'client_id': inv.client_record.id if inv.client_record else None,
    }


def set_client_active(client: Client, *, active: bool, actor, request=None):
    client.is_active = active
    client.save(update_fields=['is_active'])
    profiles = UserProfile.objects.filter(client=client).select_related('user')
    for profile in profiles:
        profile.user.is_active = active
        profile.user.save(update_fields=['is_active'])
    try:
        from .security.sessions import UserSession
        if not active:
            user_ids = list(profiles.values_list('user_id', flat=True))
            UserSession.objects.filter(user_id__in=user_ids).delete()
    except Exception:
        pass
    event = 'client.activated' if active else 'client.deactivated'
    _audit_client_action(request, client, event, details={'is_active': active})


def soft_delete_client(client: Client, *, actor, request=None):
    client.is_deleted = True
    client.is_active = False
    client.save(update_fields=['is_deleted', 'is_active'])
    set_client_active(client, active=False, actor=actor, request=request)
    _audit_client_action(request, client, 'client.deleted', details={'soft_delete': True})
