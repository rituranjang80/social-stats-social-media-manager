# ============================================================================
# Welcome / client invitation email — template, placeholders, send.
# ============================================================================
from __future__ import annotations

import html
import re
from datetime import datetime

from django.conf import settings
from django.utils import timezone

from .models import SiteContent

TEMPLATE_SITE_KEY = 'welcome-email-template'
LEGACY_TEMPLATE_KEY = 'client-invitation-email'

PLACEHOLDER_HELP = [
    '{{company_name}}',
    '{{company_logo}}',
    '{{client_name}}',
    '{{client_email}}',
    '{{accept_invitation_url}}',
    '{{login_url}}',
    '{{support_email}}',
    '{{support_phone}}',
    '{{current_year}}',
    '{{agency_name}}',
    '{{message}}',
]


def _from_email_address() -> str:
    raw = getattr(settings, 'DEFAULT_FROM_EMAIL', '') or ''
    if '<' in raw and '>' in raw:
        return raw.split('<')[1].split('>')[0].strip()
    return raw.strip()


def app_branding():
    logo = getattr(settings, 'BRAND_LOGO_URL', '') or ''
    frontend = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    if logo and not logo.startswith('http'):
        logo = f'{frontend.rstrip("/")}/{logo.lstrip("/")}'
    return {
        'company_name': getattr(settings, 'BRAND_NAME', 'Application'),
        'brand_name': getattr(settings, 'BRAND_NAME', 'Application'),
        'brand_description': getattr(settings, 'BRAND_DESCRIPTION', ''),
        'company_logo': logo or f'{frontend.rstrip("/")}/icons/icon-192.png',
        'frontend_url': frontend,
        'support_email': getattr(settings, 'SUPPORT_EMAIL', '') or _from_email_address(),
        'support_phone': getattr(settings, 'SUPPORT_PHONE', ''),
    }


def default_welcome_template():
    return {
        'subject': 'Welcome to {{company_name}}',
        'body_html': (
            '<p>Hello {{client_name}},</p>'
            '<p>Welcome to {{company_name}}.</p>'
            '<p>Your account has been created successfully.</p>'
            '<p>Click the button below to accept your invitation and securely access your account.</p>'
            '<p><a href="{{accept_invitation_url}}" '
            'style="display:inline-block;padding:12px 24px;background:#00CCF5;color:#021418;'
            'font-weight:700;text-decoration:none;border-radius:8px;">Accept Invitation</a></p>'
            '<p>{{accept_invitation_url}}</p>'
            '<p>You can also log in later using:</p>'
            '<p>{{login_url}}</p>'
            '<p>If you need assistance, please contact us at {{support_email}}'
            '{{support_phone}}.</p>'
            '<p>Regards,<br>{{company_name}}</p>'
        ),
    }


def _load_saved():
    row = SiteContent.objects.filter(key=TEMPLATE_SITE_KEY).first()
    if not row:
        row = SiteContent.objects.filter(key=LEGACY_TEMPLATE_KEY).first()
    if not row or not isinstance(row.content, dict):
        return {}
    return row.content


def get_merged_welcome_template():
    base = default_welcome_template()
    saved = _load_saved()
    base.update({k: v for k, v in saved.items() if v is not None and str(v).strip() != ''})
    return base


def save_welcome_template(data: dict):
    merged = default_welcome_template()
    for k in merged:
        if k in data and data[k] is not None:
            merged[k] = data[k]
    SiteContent.objects.update_or_create(
        key=TEMPLATE_SITE_KEY,
        defaults={
            'title': 'Welcome email template',
            'content': merged,
            'is_public': False,
            'last_updated': timezone.now().date(),
        },
    )
    return merged


def template_api_payload():
    return {
        'template': get_merged_welcome_template(),
        'defaults': default_welcome_template(),
        'placeholders': PLACEHOLDER_HELP,
        'branding': app_branding(),
    }


_VAR_RE = re.compile(r'\{\{\s*([a-z_]+)\s*\}\}')


def _substitute_html(text: str, ctx: dict) -> str:
    if not text:
        return ''

    def repl(m):
        key = m.group(1)
        val = ctx.get(key, '')
        if val is None:
            return ''
        if key in ('body_html',):
            return str(val)
        return html.escape(str(val))

    return _VAR_RE.sub(repl, text)


def _substitute_plain(text: str, ctx: dict) -> str:
    if not text:
        return ''

    def repl(m):
        return str(ctx.get(m.group(1), '') or '')

    return _VAR_RE.sub(repl, text)


def build_email_context(invitation, *, client_name: str | None = None):
    b = app_branding()
    frontend = b['frontend_url']
    accept_url = f'{frontend}/accept-invitation/{invitation.token}'
    login_url = f'{frontend}/login'
    agency = invitation.invited_by
    agency_name = agency.get_full_name() or agency.email
    name = client_name or invitation.client_email.split('@')[0].replace('.', ' ').title()
    return {
        **b,
        'company_name': b['company_name'],
        'client_name': name,
        'client_email': invitation.client_email,
        'accept_invitation_url': accept_url,
        'login_url': login_url,
        'agency_name': agency_name,
        'agency_email': agency.email,
        'message': invitation.message or '',
        'current_year': str(datetime.now().year),
        'support_phone': b.get('support_phone') or '',
    }


def render_welcome_email(invitation, *, client_name: str | None = None):
    tpl = get_merged_welcome_template()
    ctx = build_email_context(invitation, client_name=client_name)
    subject = _substitute_plain(tpl.get('subject', ''), ctx)
    body_inner = _substitute_html(tpl.get('body_html', ''), ctx)

    logo = ctx['company_logo']
    company = html.escape(ctx['company_name'])
    wrapped = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0f4f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
<tr><td style="padding:28px 32px 16px;text-align:center;border-bottom:1px solid #f1f5f9;">
<img src="{html.escape(logo)}" alt="{company}" width="64" height="64" style="border-radius:12px;object-fit:contain;" />
<p style="margin:12px 0 0;font-size:20px;font-weight:800;color:#0f172a;">{company}</p>
</td></tr>
<tr><td style="padding:28px 32px;font-size:15px;line-height:1.65;color:#334155;">{body_inner}</td></tr>
<tr><td style="padding:16px 32px 24px;background:#f8fafc;font-size:12px;color:#94a3b8;text-align:center;">
&copy; {ctx['current_year']} {company}
</td></tr>
</table></td></tr></table></body></html>"""

    plain = _substitute_plain(
        'Hello {{client_name}},\n\nWelcome to {{company_name}}.\n\n'
        'Accept invitation: {{accept_invitation_url}}\nLogin: {{login_url}}\n\n'
        'Regards,\n{{company_name}}',
        ctx,
    )
    if not subject.strip():
        subject = f'Welcome to {ctx["company_name"]}'
    return subject, plain, wrapped
