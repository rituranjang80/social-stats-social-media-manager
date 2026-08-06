# ============================================================================
# Client invitation email — branding from settings + admin-editable template.
# ============================================================================
from __future__ import annotations

import html
import re
from django.conf import settings
from django.utils import timezone

from .models import SiteContent

TEMPLATE_SITE_KEY = 'client-invitation-email'

PLACEHOLDER_HELP = [
    '{{brand_name}}',
    '{{brand_description}}',
    '{{agency_name}}',
    '{{agency_email}}',
    '{{client_email}}',
    '{{client_name}}',
    '{{message}}',
    '{{invite_url}}',
    '{{login_url}}',
    '{{app_url}}',
    '{{temp_password}}',
    '{{expires_days}}',
]


def app_branding():
    return {
        'brand_name': getattr(settings, 'BRAND_NAME', 'Application'),
        'brand_short_name': getattr(settings, 'BRAND_SHORT_NAME', 'App'),
        'brand_description': getattr(settings, 'BRAND_DESCRIPTION', ''),
        'frontend_url': getattr(settings, 'FRONTEND_URL', 'http://localhost:3000'),
    }


def default_invitation_template():
    b = app_branding()
    name = b['brand_name']
    desc = b['brand_description'] or f'{name} — your marketing workspace.'
    return {
        'subject': f'Welcome to {name} — invitation from {{{{agency_name}}}}',
        'title': f'Welcome to {name}',
        'greeting': (
            'Hi <strong style="color:#0f172a;">{{client_name}}</strong>, '
            f'<strong style="color:#0f172a;">{{{{agency_name}}}}</strong> has invited you to join '
            f'<strong style="color:#0f172a;">{name}</strong>.'
        ),
        'body_html': (
            f'<p style="font-size:14px;color:#64748b;line-height:1.7;margin:0 0 16px;">{html.escape(desc)}</p>'
            '<div style="background:linear-gradient(135deg,#f0f9ff,#f8faff);border:1px solid rgba(0,215,255,0.18);'
            'border-radius:14px;padding:20px 24px;margin:0 0 20px;">'
            '<p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#00b8d9;text-transform:uppercase;'
            'letter-spacing:0.08em;">Message from {{agency_name}}</p>'
            '<p style="margin:0;font-size:15px;color:#1e293b;line-height:1.7;">{{message}}</p>'
            '</div>'
            '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 18px;margin:0 0 8px;">'
            '<p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#92400e;">Your sign-in details</p>'
            '<p style="margin:0 0 6px;font-size:14px;color:#1e293b;"><strong>Email:</strong> {{client_email}}</p>'
            '<p style="margin:0 0 6px;font-size:14px;color:#1e293b;"><strong>Temporary password:</strong> '
            '<code style="background:#fef3c7;padding:2px 8px;border-radius:6px;">{{temp_password}}</code></p>'
            '<p style="margin:8px 0 0;font-size:13px;color:#64748b;line-height:1.6;">'
            'Sign in at <a href="{{login_url}}" style="color:#0099bb;">{{login_url}}</a>, '
            'then open your invitation: <a href="{{invite_url}}" style="color:#0099bb;">{{invite_url}}</a>'
            '</p></div>'
        ),
        'body_html_existing_user': (
            '<div style="background:linear-gradient(135deg,#f0f9ff,#f8faff);border:1px solid rgba(0,215,255,0.18);'
            'border-radius:14px;padding:20px 24px;margin:0 0 20px;">'
            '<p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#00b8d9;text-transform:uppercase;'
            'letter-spacing:0.08em;">Message from {{agency_name}}</p>'
            '<p style="margin:0;font-size:15px;color:#1e293b;line-height:1.7;">{{message}}</p>'
            '</div>'
            '<p style="font-size:14px;color:#64748b;line-height:1.7;margin:0;">'
            'Use the button below to review and accept or decline this invitation in {{brand_name}}.'
            '</p>'
        ),
        'subject_existing': '{{agency_name}} wants to manage your {{brand_name}} account',
        'title_existing': 'Invitation to connect',
        'greeting_existing': (
            'Hi <strong style="color:#0f172a;">{{client_name}}</strong>, '
            '<strong style="color:#0f172a;">{{agency_name}}</strong> has invited you on '
            '<strong style="color:#0f172a;">{{brand_name}}</strong>.'
        ),
        'cta_label': f'Open {name}',
        'cta_label_existing': 'Review invitation',
        'expiry_note': (
            '&#9203; This invitation expires in <strong>{{expires_days}} days</strong>. '
            'If you did not expect this email, you can safely ignore it.'
        ),
        'plain_intro': (
            f'Welcome to {name}.\n\n'
            '{{agency_name}} ({{agency_email}}) invited {{client_email}}.\n\n'
            'Message: {{message}}\n\n'
        ),
        'plain_credentials': (
            'Sign-in email: {{client_email}}\n'
            'Temporary password: {{temp_password}}\n'
            'Login: {{login_url}}\n'
            'Invitation: {{invite_url}}\n\n'
        ),
    }


def _load_saved_template():
    row = SiteContent.objects.filter(key=TEMPLATE_SITE_KEY).first()
    if not row or not isinstance(row.content, dict):
        return {}
    return row.content


def get_merged_invitation_template():
    base = default_invitation_template()
    saved = _load_saved_template()
    base.update({k: v for k, v in saved.items() if v is not None and str(v).strip() != ''})
    return base


def save_invitation_template(data: dict):
    merged = default_invitation_template()
    allowed = set(merged.keys())
    patch = {k: data[k] for k in allowed if k in data}
    merged.update(patch)
    SiteContent.objects.update_or_create(
        key=TEMPLATE_SITE_KEY,
        defaults={
            'title': 'Client invitation email',
            'content': merged,
            'is_public': False,
            'last_updated': timezone.now().date(),
        },
    )
    return merged


def template_api_payload():
    return {
        'template': get_merged_invitation_template(),
        'defaults': default_invitation_template(),
        'placeholders': PLACEHOLDER_HELP,
        'branding': app_branding(),
    }


_VAR_RE = re.compile(r'\{\{\s*([a-z_]+)\s*\}\}')


def _substitute(text: str, ctx: dict) -> str:
    if not text:
        return ''

    def repl(m):
        key = m.group(1)
        val = ctx.get(key, '')
        if val is None:
            return ''
        if key in ('message', 'brand_description'):
            return html.escape(str(val))
        return html.escape(str(val))

    return _VAR_RE.sub(repl, text)


def _substitute_plain(text: str, ctx: dict) -> str:
    if not text:
        return ''

    def repl(m):
        key = m.group(1)
        return str(ctx.get(key, '') or '')

    return _VAR_RE.sub(repl, text)


def build_invitation_email(invitation, *, client_user, temp_password=None):
    """Return (subject, plain, html) for outbound client invitation."""
    from .auth_views import _email_html

    tpl = get_merged_invitation_template()
    b = app_branding()
    frontend = b['frontend_url']
    agency = invitation.invited_by
    agency_name = agency.get_full_name() or agency.email
    invite_url = f'{frontend}/invitation/{invitation.token}'
    login_url = f'{frontend}/login?next=/invitation/{invitation.token}'
    app_url = frontend

    if client_user:
        client_name = client_user.get_full_name() or client_user.email.split('@')[0]
    else:
        client_name = invitation.client_email.split('@')[0]

    expires_days = '7'
    if invitation.expires_at:
        delta = invitation.expires_at - timezone.now()
        expires_days = str(max(1, delta.days))

    ctx = {
        **b,
        'agency_name': agency_name,
        'agency_email': agency.email,
        'client_email': invitation.client_email,
        'client_name': client_name,
        'message': invitation.message or 'We would like to connect your workspace with our team.',
        'invite_url': invite_url,
        'login_url': login_url,
        'app_url': app_url,
        'temp_password': temp_password or '',
        'expires_days': expires_days,
    }

    is_new_provision = bool(temp_password)

    if is_new_provision:
        subject = _substitute_plain(tpl.get('subject', ''), ctx)
        title = _substitute_plain(tpl.get('title', 'Invitation'), ctx)
        greeting = _substitute(tpl.get('greeting', ''), ctx)
        body_html = _substitute(tpl.get('body_html', ''), ctx)
        cta_label = _substitute_plain(tpl.get('cta_label', 'Get started'), ctx)
        cta_url = invite_url
    else:
        subject = _substitute_plain(
            tpl.get('subject_existing') or tpl.get('subject', ''), ctx,
        )
        title = _substitute_plain(tpl.get('title_existing') or tpl.get('title', 'Invitation'), ctx)
        greeting = _substitute(
            tpl.get('greeting_existing') or tpl.get('greeting', ''), ctx,
        )
        body_html = _substitute(tpl.get('body_html_existing_user', ''), ctx)
        cta_label = _substitute_plain(tpl.get('cta_label_existing', 'Review invitation'), ctx)
        cta_url = invite_url

    expiry_note = _substitute(tpl.get('expiry_note', ''), ctx)

    html_out = _email_html(
        title=title,
        greeting=greeting,
        body_html=body_html,
        cta_url=cta_url,
        cta_label=cta_label,
        expiry_note=expiry_note,
        frontend_url=frontend,
        brand_name=b['brand_name'],
        brand_description=b['brand_description'],
    )

    plain = _substitute_plain(tpl.get('plain_intro', ''), ctx)
    if is_new_provision and temp_password:
        plain += _substitute_plain(tpl.get('plain_credentials', ''), ctx)
    plain += f'Open invitation: {invite_url}\n'
    plain += f'App: {app_url}\n'
    plain += f'This invitation expires in {expires_days} days.\n'

    if not subject.strip():
        subject = f'{agency_name} invited you to {b["brand_name"]}'

    return subject, plain, html_out
