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

def _send_verification_email(user, token):
    verify_url = f"{FRONTEND_URL}/verify-email?token={token}"
    name       = user.first_name or user.email.split('@')[0]

    subject = 'Verify your Statox account'
    html    = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f4f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;border:1px solid #e5e7eb;box-shadow:0 8px 32px rgba(0,0,0,.08);overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#021418 0%,#0a2a35 100%);padding:28px 40px;text-align:center;">
            <img src="{FRONTEND_URL}/favicon.png" alt="Statox" width="48" height="48"
                 style="display:inline-block;border-radius:12px;margin-bottom:10px;" /><br>
            <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.03em;">Statox.ai</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#0f172a;">Verify your email</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">
              Hi {name}, thanks for signing up! Click the button below to verify your email address and activate your Statox account.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="{verify_url}"
                 style="display:inline-block;background:#00d7ff;color:#021418;font-weight:700;font-size:15px;
                        padding:14px 36px;border-radius:12px;text-decoration:none;letter-spacing:0.01em;">
                Verify Email Address
              </a>
            </div>
            <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
              This link expires in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.
            </p>
            <hr style="margin:28px 0;border:none;border-top:1px solid #f1f5f9;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              Or copy this URL into your browser:<br>
              <span style="color:#0ea5e9;word-break:break-all;">{verify_url}</span>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #f1f5f9;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              &copy; 2026 Statox.ai &mdash; Automation Intelligence Platform
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""
    plain = f"Hi {name},\n\nVerify your Statox account:\n{verify_url}\n\nThis link expires in 24 hours."

    try:
        send_mail(subject, plain, FROM_EMAIL, [user.email], html_message=html, fail_silently=False)
    except Exception:
        pass  # Don't fail signup if email delivery fails


def _send_reset_email(user, token):
    reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
    name      = user.first_name or user.email.split('@')[0]

    subject = 'Reset your Statox password'
    html    = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f4f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;border:1px solid #e5e7eb;box-shadow:0 8px 32px rgba(0,0,0,.08);overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#021418 0%,#0a2a35 100%);padding:28px 40px;text-align:center;">
            <img src="{FRONTEND_URL}/favicon.png" alt="Statox" width="48" height="48"
                 style="display:inline-block;border-radius:12px;margin-bottom:10px;" /><br>
            <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.03em;">Statox.ai</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#0f172a;">Reset your password</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">
              Hi {name}, we received a request to reset your password. Click the button below to set a new one.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="{reset_url}"
                 style="display:inline-block;background:#00d7ff;color:#021418;font-weight:700;font-size:15px;
                        padding:14px 36px;border-radius:12px;text-decoration:none;letter-spacing:0.01em;">
                Reset Password
              </a>
            </div>
            <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
              This link expires in <strong>2 hours</strong>. If you didn't request a password reset, you can safely ignore this email.
            </p>
            <hr style="margin:28px 0;border:none;border-top:1px solid #f1f5f9;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              Or copy this URL into your browser:<br>
              <span style="color:#0ea5e9;word-break:break-all;">{reset_url}</span>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #f1f5f9;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              &copy; 2026 Statox.ai &mdash; Automation Intelligence Platform
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""
    plain = f"Hi {name},\n\nReset your Statox password:\n{reset_url}\n\nThis link expires in 2 hours."

    try:
        send_mail(subject, plain, FROM_EMAIL, [user.email], html_message=html, fail_silently=False)
    except Exception:
        pass
