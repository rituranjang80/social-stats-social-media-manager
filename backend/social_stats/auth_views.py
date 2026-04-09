"""
Email/password signup + email verification + password reset.
Only for client role — agency/staff are manually managed.
"""
import re
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import UserProfile, EmailVerificationToken, PasswordResetToken
from .social_auth_views import _make_jwt


FRONTEND_URL = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
FROM_EMAIL   = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@statox.ai')

EMAIL_RE = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')


# ── Signup ────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def signup(request):
    """
    POST { full_name, email, password, terms_accepted }
    Creates an unverified client account and sends a verification email.
    """
    data          = request.data
    full_name     = (data.get('full_name') or '').strip()
    email         = (data.get('email') or '').strip().lower()
    password      = data.get('password', '')
    terms         = data.get('terms_accepted', False)

    errors = {}
    if not full_name:
        errors['full_name'] = 'Full name is required.'
    if not email:
        errors['email'] = 'Email is required.'
    elif not EMAIL_RE.match(email):
        errors['email'] = 'Enter a valid email address.'
    if not password:
        errors['password'] = 'Password is required.'
    if not terms:
        errors['terms'] = 'You must accept the Terms of Service.'

    if errors:
        return Response({'errors': errors}, status=400)

    # Validate password strength
    temp_user = User(username=email, email=email)
    try:
        validate_password(password, temp_user)
    except ValidationError as e:
        return Response({'errors': {'password': ' '.join(e.messages)}}, status=400)

    if User.objects.filter(username=email).exists():
        return Response({'errors': {'email': 'An account with this email already exists.'}}, status=400)

    # Create user (inactive until email verified)
    parts = full_name.split(' ', 1)
    user  = User.objects.create_user(
        username   = email,
        email      = email,
        password   = password,
        first_name = parts[0],
        last_name  = parts[1] if len(parts) > 1 else '',
        is_active  = False,
    )
    UserProfile.objects.create(
        user               = user,
        role               = 'client',
        is_self_registered = True,
        email_verified     = False,
        terms_accepted     = True,
        terms_accepted_at  = timezone.now(),
    )

    token_obj = EmailVerificationToken.objects.create(user=user)
    _send_verification_email(user, token_obj.token)

    return Response({'detail': 'Account created. Please check your email to verify your account.'}, status=201)


# ── Verify email ─────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def verify_email(request):
    """
    GET /auth/verify-email/?token=UUID
    Activates user and returns JWT tokens.
    """
    token_str = request.query_params.get('token', '')
    try:
        token_obj = EmailVerificationToken.objects.select_related('user').get(token=token_str)
    except (EmailVerificationToken.DoesNotExist, ValueError):
        return Response({'error': 'Invalid or expired verification link.'}, status=400)

    if not token_obj.is_valid():
        return Response({'error': 'This verification link has expired. Please request a new one.'}, status=400)

    user = token_obj.user
    user.is_active = True
    user.save(update_fields=['is_active'])

    token_obj.is_used = True
    token_obj.save(update_fields=['is_used'])

    profile = user.profile
    profile.email_verified = True
    profile.save(update_fields=['email_verified'])

    # Notify any agencies that invited this client: "Your client joined Statox"
    try:
        from .models import ClientInvitation, Notification
        pending_invs = ClientInvitation.objects.filter(
            client_email__iexact=user.email,
            status='pending',
        ).select_related('invited_by')
        for inv in pending_invs:
            _send_client_joined_email(inv.invited_by, user)
            Notification.objects.create(
                user       = inv.invited_by,
                notif_type = 'client_joined',
                title      = f"{user.get_full_name() or user.email} joined Statox",
                body       = (
                    f"Your client {user.get_full_name() or user.email} has joined Statox. "
                    f"You can now send them a dashboard access request."
                ),
                data       = {'client_email': user.email, 'event': 'client_joined'},
            )
    except Exception:
        pass

    access, refresh = _make_jwt(user)
    return Response({'access': access, 'refresh': refresh, 'detail': 'Email verified successfully.'})


# ── Resend verification ───────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def resend_verification(request):
    """POST { email } — resend verification email."""
    email = (request.data.get('email') or '').strip().lower()
    if not email:
        return Response({'error': 'Email is required.'}, status=400)

    try:
        user = User.objects.get(username=email, is_active=False)
    except User.DoesNotExist:
        # Don't leak whether email exists
        return Response({'detail': 'If that email is registered and unverified, a new link has been sent.'})

    # Delete any existing token and create a fresh one
    EmailVerificationToken.objects.filter(user=user).delete()
    token_obj = EmailVerificationToken.objects.create(user=user)
    _send_verification_email(user, token_obj.token)

    return Response({'detail': 'A new verification email has been sent.'})


# ── Password reset request ────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    """POST { email } — send password reset link."""
    email = (request.data.get('email') or '').strip().lower()
    if not email:
        return Response({'error': 'Email is required.'}, status=400)

    try:
        user = User.objects.get(username=email, is_active=True)
    except User.DoesNotExist:
        return Response({'detail': 'If that email is registered, a reset link has been sent.'})

    # Create a new reset token (invalidates old ones by deleting them)
    PasswordResetToken.objects.filter(user=user).delete()
    token_obj = PasswordResetToken.objects.create(user=user)
    _send_reset_email(user, token_obj.token)

    return Response({'detail': 'A password reset link has been sent to your email.'})


# ── Password reset confirm ────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    """POST { token, password } — set new password."""
    token_str = (request.data.get('token') or '').strip()
    password  = request.data.get('password', '')

    if not token_str or not password:
        return Response({'error': 'Token and password are required.'}, status=400)

    try:
        token_obj = PasswordResetToken.objects.select_related('user').get(token=token_str)
    except (PasswordResetToken.DoesNotExist, ValueError):
        return Response({'error': 'Invalid or expired reset link.'}, status=400)

    if not token_obj.is_valid():
        return Response({'error': 'This reset link has expired. Please request a new one.'}, status=400)

    user = token_obj.user
    try:
        validate_password(password, user)
    except ValidationError as e:
        return Response({'errors': {'password': ' '.join(e.messages)}}, status=400)

    user.set_password(password)
    user.save(update_fields=['password'])

    token_obj.is_used = True
    token_obj.save(update_fields=['is_used'])

    return Response({'detail': 'Password has been reset successfully. You can now sign in.'})


# ── Email helpers ─────────────────────────────────────────────────────────────

def _email_html(title, greeting, body_html, cta_url, cta_label, expiry_note, frontend_url):
    """Shared light-background email template matching app card style."""
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:linear-gradient(160deg,#f0f9ff 0%,#f0f4f9 50%,#f5f0ff 100%);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 20px 40px;">
    <tr><td align="center">

      <!-- Card -->
      <table width="520" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:24px;border:1px solid rgba(0,215,255,0.18);
                    box-shadow:0 8px 40px rgba(15,23,42,0.10),0 0 0 1px rgba(0,215,255,0.06);overflow:hidden;">

        <!-- Top accent line -->
        <tr>
          <td style="background:linear-gradient(90deg,#00d7ff 0%,#0099bb 100%);height:4px;font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- Header -->
        <tr>
          <td style="padding:32px 40px 24px;text-align:center;background:#ffffff;">
            <img src="{frontend_url}/favicon.png" alt="Statox" width="52" height="52"
                 style="border-radius:14px;display:inline-block;
                        box-shadow:0 4px 16px rgba(0,215,255,0.25);margin-bottom:14px;" /><br>
            <span style="font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.04em;">Statox</span>
            <span style="font-size:22px;font-weight:800;color:#00b8d9;letter-spacing:-0.04em;">.ai</span>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:0 40px;">
            <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(0,215,255,0.2),transparent);"></div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 28px;">

            <!-- Title -->
            <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#0f172a;letter-spacing:-0.03em;">{title}</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.7;">{greeting}</p>

            {body_html}

            <!-- CTA Button -->
            <div style="text-align:center;margin:32px 0;">
              <a href="{cta_url}"
                 style="display:inline-block;background:linear-gradient(135deg,#00d7ff 0%,#00b0d0 100%);
                        color:#021418;font-weight:800;font-size:15px;letter-spacing:0.01em;
                        padding:15px 40px;border-radius:14px;text-decoration:none;
                        box-shadow:0 8px 24px rgba(0,215,255,0.35);">
                {cta_label}
              </a>
            </div>

            <!-- Expiry note -->
            <div style="background:linear-gradient(135deg,#f0f9ff,#f8faff);border:1px solid rgba(0,215,255,0.15);
                        border-radius:12px;padding:14px 18px;margin-bottom:24px;">
              <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">{expiry_note}</p>
            </div>

            <!-- Plain URL fallback -->
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
              Or copy this link into your browser:<br>
              <a href="{cta_url}" style="color:#0099bb;word-break:break-all;text-decoration:none;">{cta_url}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:linear-gradient(135deg,#f8fafc,#f0f9ff);padding:20px 40px;
                     text-align:center;border-top:1px solid rgba(0,215,255,0.1);">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              &copy; 2026 <strong style="color:#64748b;">Statox.ai</strong> &mdash; Automation Intelligence Platform
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _send_client_joined_email(agency_user, client_user):
    """Notify agency when their invited client signs up and verifies email."""
    agency_name  = agency_user.first_name or agency_user.email.split('@')[0]
    client_name  = client_user.get_full_name() or client_user.email
    client_email = client_user.email

    subject = f"{client_name} joined Statox — send a dashboard access request"
    html = _email_html(
        title        = 'Your client joined Statox! 🎉',
        greeting     = (
            f'Hi <strong style="color:#0f172a;">{agency_name}</strong>, '
            f'great news! <strong style="color:#0f172a;">{client_name}</strong> '
            f'({client_email}) has just verified their email and joined Statox.'
        ),
        body_html    = (
            f'<div style="background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:1px solid rgba(22,163,74,0.2);'
            f'border-radius:14px;padding:20px 24px;margin:0 0 24px;">'
            f'<p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:0.08em;">Client Joined</p>'
            f'<p style="margin:0;font-size:18px;font-weight:700;color:#0f172a;">{client_name}</p>'
            f'<p style="margin:4px 0 0;font-size:13px;color:#64748b;">{client_email}</p>'
            f'</div>'
            f'<p style="font-size:14px;color:#64748b;line-height:1.7;margin:0 0 4px;">'
            f'You can now go to your Clients page and send them a dashboard access request to connect their account to your agency.</p>'
        ),
        cta_url      = f'{FRONTEND_URL}/admin/clients',
        cta_label    = 'Go to Clients Page',
        expiry_note  = 'The client will need to accept your access request to connect their account to your agency.',
        frontend_url = FRONTEND_URL,
    )
    plain = (
        f"Hi {agency_name},\n\n"
        f"{client_name} ({client_email}) has joined Statox!\n\n"
        f"You can now send them a dashboard access request from your Clients page:\n"
        f"{FRONTEND_URL}/admin/clients\n"
    )
    try:
        send_mail(subject, plain, FROM_EMAIL, [agency_user.email], html_message=html, fail_silently=True)
    except Exception:
        pass


def _send_verification_email(user, token):
    verify_url = f"{FRONTEND_URL}/verify-email?token={token}"
    name       = user.first_name or user.email.split('@')[0]

    subject = 'Verify your Statox account'
    html = _email_html(
        title      = 'Verify your email',
        greeting   = f'Hi <strong style="color:#0f172a;">{name}</strong>, thanks for signing up! Click the button below to verify your email address and activate your Statox account.',
        body_html  = '',
        cta_url    = verify_url,
        cta_label  = 'Verify Email Address',
        expiry_note= '&#128274; This link expires in <strong>24 hours</strong>. If you didn\'t create a Statox account, you can safely ignore this email.',
        frontend_url = FRONTEND_URL,
    )
    plain = f"Hi {name},\n\nVerify your Statox account:\n{verify_url}\n\nThis link expires in 24 hours."

    try:
        send_mail(subject, plain, FROM_EMAIL, [user.email], html_message=html, fail_silently=False)
    except Exception:
        pass


def _send_reset_email(user, token):
    reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
    name      = user.first_name or user.email.split('@')[0]

    subject = 'Reset your Statox password'
    html = _email_html(
        title      = 'Reset your password',
        greeting   = f'Hi <strong style="color:#0f172a;">{name}</strong>, we received a request to reset your Statox password. Click the button below to set a new one.',
        body_html  = '',
        cta_url    = reset_url,
        cta_label  = 'Reset Password',
        expiry_note= '&#9203; This link expires in <strong>2 hours</strong>. If you didn\'t request a password reset, you can safely ignore this email.',
        frontend_url = FRONTEND_URL,
    )
    plain = f"Hi {name},\n\nReset your Statox password:\n{reset_url}\n\nThis link expires in 2 hours."

    try:
        send_mail(subject, plain, FROM_EMAIL, [user.email], html_message=html, fail_silently=False)
    except Exception:
        pass
