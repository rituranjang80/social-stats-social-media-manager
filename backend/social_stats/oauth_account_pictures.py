# ============================================================================
# Fetch / cache connected-account profile images (Postiz-style channel avatars).
# ============================================================================
from __future__ import annotations

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def _meta_version() -> str:
    return getattr(settings, 'META_API_VERSION', 'v21.0')


def _fb_picture_url(page_or_user_id: str, access_token: str) -> str:
    if not page_or_user_id or not access_token:
        return ''
    try:
        resp = requests.get(
            f'https://graph.facebook.com/{_meta_version()}/{page_or_user_id}/picture',
            params={'redirect': '0', 'type': 'large', 'access_token': access_token},
            timeout=10,
        ).json()
        data = resp.get('data') or {}
        if data.get('is_silhouette'):
            return ''
        return (data.get('url') or '').strip()
    except Exception as exc:
        logger.debug('FB picture fetch failed for %s: %s', page_or_user_id, exc)
        return ''


def _ig_picture_url(instagram_account_id: str, access_token: str) -> str:
    if not instagram_account_id or not access_token:
        return ''
    try:
        resp = requests.get(
            f'https://graph.facebook.com/{_meta_version()}/{instagram_account_id}',
            params={'fields': 'profile_picture_url', 'access_token': access_token},
            timeout=10,
        ).json()
        return (resp.get('profile_picture_url') or '').strip()
    except Exception as exc:
        logger.debug('IG picture fetch failed for %s: %s', instagram_account_id, exc)
        return ''


def _youtube_picture_url(channel_id: str, access_token: str) -> str:
    if not channel_id or not access_token:
        return ''
    try:
        resp = requests.get(
            'https://www.googleapis.com/youtube/v3/channels',
            params={
                'part': 'snippet',
                'id': channel_id,
                'access_token': access_token,
            },
            timeout=10,
        ).json()
        items = resp.get('items') or []
        if not items:
            return ''
        thumbs = (items[0].get('snippet') or {}).get('thumbnails') or {}
        for key in ('high', 'medium', 'default'):
            url = (thumbs.get(key) or {}).get('url')
            if url:
                return url.strip()
    except Exception as exc:
        logger.debug('YouTube picture fetch failed for %s: %s', channel_id, exc)
    return ''


def _google_user_picture(access_token: str) -> str:
    if not access_token:
        return ''
    try:
        resp = requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=10,
        ).json()
        return (resp.get('picture') or '').strip()
    except Exception as exc:
        logger.debug('Google userinfo picture failed: %s', exc)
        return ''


def _linkedin_picture_url(access_token: str) -> str:
    if not access_token:
        return ''
    try:
        resp = requests.get(
            'https://api.linkedin.com/v2/userinfo',
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=10,
        ).json()
        return (resp.get('picture') or '').strip()
    except Exception as exc:
        logger.debug('LinkedIn userinfo picture failed: %s', exc)
        return ''


def fetch_account_picture_url(cred) -> str:
    """Return a profile/page image URL from the platform APIs (best effort)."""
    platform = cred.platform
    token = cred.access_token or ''

    if platform == 'facebook':
        return _fb_picture_url(cred.page_id, token) if cred.page_id else _fb_picture_url(
            cred.platform_user_id, token
        )
    if platform == 'instagram':
        url = _ig_picture_url(cred.instagram_account_id, token)
        if url:
            return url
        return _fb_picture_url(cred.page_id, token)
    if platform == 'youtube':
        return _youtube_picture_url(cred.channel_id, token)
    if platform == 'linkedin':
        return _linkedin_picture_url(token)
    if platform == 'google_my_business':
        return _google_user_picture(token)
    return ''


def ensure_account_picture_url(cred, *, save: bool = True) -> str:
    """
    Return stored picture URL, fetching from the platform when missing.
    Persists to PlatformCredential.account_picture_url when newly resolved.
    """
    existing = (getattr(cred, 'account_picture_url', None) or '').strip()
    if existing:
        return existing
    if not cred.access_token:
        return ''

    url = fetch_account_picture_url(cred)
    if not url:
        return ''

    if save:
        cred.account_picture_url = url
        cred.save(update_fields=['account_picture_url', 'updated_at'])
    return url
