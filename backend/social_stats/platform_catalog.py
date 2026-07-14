"""Env-driven social platform catalog (SS-compatible).

Visibility and ``is_configured`` come from SocialMediaStart ``.env`` via Django
settings ``PLATFORM_CREDENTIALS_FROM_ENV`` and ``CONNECT_PLATFORMS`` — not
hardcoded frontend flags.
"""
from __future__ import annotations

from django.conf import settings

# Keys that use PlatformCredential rows in this product today
OAUTH_LIVE_KEYS = (
    'facebook',
    'instagram',
    'youtube',
    'linkedin',
    'google_my_business',
)

# UI metadata (labels / variants). Credentials + visibility live in settings.
_PLATFORM_META: list[dict] = [
    {'id': 'facebook', 'label': 'Facebook', 'subtitle': 'Your Pages & Groups', 'variant': 'gradient-blue', 'icon': 'facebook'},
    {'id': 'instagram', 'label': 'Instagram', 'subtitle': 'For accounts linked to a Facebook Page', 'variant': 'gradient-instagram', 'icon': 'instagram'},
    {'id': 'instagram_login', 'label': 'Instagram Login', 'subtitle': 'Sign in with Instagram · no Facebook needed', 'variant': 'gradient-instagram', 'icon': 'instagram'},
    {'id': 'linkedin', 'label': 'LinkedIn', 'subtitle': 'Company & personal publishing', 'variant': 'pattern-linkedin', 'icon': 'linkedin'},
    {'id': 'linkedin_personal', 'label': 'LinkedIn Personal', 'subtitle': 'Personal profile', 'variant': 'pattern-linkedin', 'icon': 'linkedin'},
    {'id': 'linkedin_company', 'label': 'LinkedIn Company', 'subtitle': 'Company pages', 'variant': 'pattern-linkedin', 'icon': 'linkedin'},
    {'id': 'tiktok', 'label': 'TikTok', 'subtitle': 'Video content', 'variant': 'glass-dark', 'icon': 'tiktok'},
    {'id': 'youtube', 'label': 'YouTube', 'subtitle': 'Videos & Shorts', 'variant': 'glass-light', 'icon': 'youtube'},
    {'id': 'pinterest', 'label': 'Pinterest', 'subtitle': 'Pins & Boards', 'variant': 'glass-light', 'icon': 'pinterest'},
    {'id': 'threads', 'label': 'Threads', 'subtitle': 'Text & Media', 'variant': 'glass-light', 'icon': 'threads'},
    {'id': 'bluesky', 'label': 'Bluesky', 'subtitle': 'AT Protocol', 'variant': 'glass-light', 'icon': 'bluesky'},
    {'id': 'google_my_business', 'label': 'Google Business', 'subtitle': 'Local posts & insights', 'variant': 'glass-light', 'icon': 'google_my_business'},
    {'id': 'mastodon', 'label': 'Mastodon', 'subtitle': 'Federated social', 'variant': 'glass-light', 'icon': 'mastodon'},
    {'id': 'twitter', 'label': 'X (Twitter)', 'subtitle': 'Posts & engagement', 'variant': 'glass-dark', 'icon': 'twitter'},
]

# Catalog id → oauth start wiring used by this codebase today
_CONNECT_HANDLERS: dict[str, dict] = {
    'facebook': {'provider': 'facebook', 'credential_key': 'facebook'},
    'instagram': {'provider': 'facebook', 'credential_key': 'instagram'},
    'instagram_login': {'provider': 'facebook', 'credential_key': 'instagram'},
    'threads': {'provider': 'facebook', 'credential_key': 'facebook'},
    'youtube': {'provider': 'google', 'google_platform': 'youtube', 'credential_key': 'youtube'},
    'google_my_business': {
        'provider': 'google',
        'google_platform': 'google_my_business',
        'credential_key': 'google_my_business',
    },
    'linkedin': {'provider': 'linkedin', 'credential_key': 'linkedin'},
    'linkedin_personal': {'provider': 'linkedin', 'credential_key': 'linkedin'},
    'linkedin_company': {'provider': 'linkedin', 'credential_key': 'linkedin'},
}


def get_configured_platforms() -> set[str]:
    """Platforms that have app-level credentials in env."""
    configured: set[str] = set()
    env_creds = getattr(settings, 'PLATFORM_CREDENTIALS_FROM_ENV', {}) or {}
    for platform, creds in env_creds.items():
        if not isinstance(creds, dict):
            continue
        if any(v for k, v in creds.items() if not str(k).startswith('_') and v):
            configured.add(platform)
            if platform == 'facebook':
                configured.update({'instagram', 'threads'})
            if platform == 'instagram':
                configured.add('facebook')
            if platform in ('google_business', 'google_my_business', 'youtube'):
                configured.update({'youtube', 'google_my_business', 'google_business'})
            if platform in ('linkedin_personal', 'linkedin_company', 'linkedin'):
                configured.update({'linkedin', 'linkedin_personal', 'linkedin_company'})
            if platform == 'instagram_login':
                configured.add('instagram_login')
    return configured


def _visible_ids() -> list[str]:
    raw = (getattr(settings, 'CONNECT_PLATFORMS', None) or '').strip()
    if raw:
        return [p.strip() for p in raw.split(',') if p.strip()]
    return [m['id'] for m in _PLATFORM_META]


def build_connect_catalog(*, status_by_platform: dict | None = None) -> list[dict]:
    """Full connect-page payload for Settings / composer UI."""
    status_by_platform = status_by_platform or {}
    configured = get_configured_platforms()
    visible = _visible_ids()
    meta_by_id = {m['id']: m for m in _PLATFORM_META}
    enabled_map = getattr(settings, 'PLATFORM_ENABLED', {}) or {}

    cards = []
    for pid in visible:
        meta = meta_by_id.get(pid)
        if not meta:
            continue
        if enabled_map.get(pid) is False:
            continue

        handler = _CONNECT_HANDLERS.get(pid)
        is_configured = pid in configured
        connectable = bool(handler) and is_configured

        cred_key = (handler or {}).get('credential_key', pid)
        st = status_by_platform.get(cred_key) or status_by_platform.get(pid) or {}
        user_status = st.get('status', 'not_connected')

        cards.append({
            'id': pid,
            'label': meta['label'],
            'subtitle': meta['subtitle'],
            'variant': meta['variant'],
            'icon': meta['icon'],
            'is_configured': is_configured,
            'connectable': connectable,
            'oauth_provider': (handler or {}).get('provider'),
            'google_platform': (handler or {}).get('google_platform'),
            'credential_key': cred_key,
            'status': user_status,
            'account_name': st.get('account_name', ''),
            'expires_at': st.get('expires_at'),
            'connected_at': st.get('connected_at'),
        })
    return cards
