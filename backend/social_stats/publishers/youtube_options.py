# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Normalize UnifiedPost.platform_overrides['youtube'] into YouTubePublisher kwargs."""
from __future__ import annotations

from typing import Any, Optional


def _tags(value) -> list:
    if value is None:
        return []
    if isinstance(value, str):
        return [t.strip() for t in value.split(',') if t.strip()][:30]
    if isinstance(value, (list, tuple)):
        return [str(t).strip() for t in value if str(t).strip()][:30]
    return []


def build_youtube_kwargs(
    post,
    overrides: Optional[dict] = None,
    *,
    resolve_thumbnail_url=None,
) -> dict[str, Any]:
    """
    Map composer YouTube settings (platform_overrides.youtube) to publisher kwargs.

    ``resolve_thumbnail_url(asset_id)`` optional callable → public thumb URL.
    """
    yt = overrides or {}
    title = (
        (yt.get('title_override') or yt.get('title') or getattr(post, 'title', None) or '')
        .strip()
    )
    description = (
        yt.get('description_override')
        or yt.get('description')
        or yt.get('content')
        or getattr(post, 'content', None)
        or ''
    )

    privacy = (yt.get('privacy_status') or yt.get('privacy') or 'public').lower()
    scheduled = yt.get('schedule_publish_at') or yt.get('scheduled_publish_time') or ''
    if privacy == 'scheduled' and scheduled:
        privacy = 'private'

    made = yt.get('made_for_kids')
    if made is None:
        made = yt.get('self_declared_made_for_kids', False)

    kwargs: dict[str, Any] = {
        'title': title or None,
        'tags': _tags(yt.get('tags') or yt.get('youtube_tags')),
        'category_id': str(yt.get('category_id') or 22),
        'privacy': privacy if privacy in ('public', 'unlisted', 'private', 'scheduled') else 'public',
        'made_for_kids': bool(made),
        'license': yt.get('license') or 'youtube',
        'embeddable': bool(yt.get('embeddable', True)),
        'public_stats_viewable': bool(
            yt.get('public_stats_viewable', yt.get('publish_to_subscriptions', True))
        ),
        'notify_subscribers': bool(yt.get('notify_subscribers', True)),
        'is_premiere': bool(yt.get('is_premiere', False)),
        'age_restriction': bool(yt.get('age_restriction', False)),
        'playlist_id': (yt.get('playlist_id') or '').strip() or None,
        'default_language': (yt.get('video_language') or yt.get('default_language') or '').strip() or None,
        'default_audio_language': (
            yt.get('default_audio_language') or yt.get('language') or ''
        ).strip() or None,
        'recording_date': (yt.get('recording_date') or '').strip() or None,
        'recording_location': (yt.get('recording_location') or '').strip() or None,
    }

    if scheduled:
        # datetime-local from the UI is naive local; coerce to RFC3339 when possible
        from datetime import timezone as dt_timezone
        from django.utils.dateparse import parse_datetime
        from django.utils import timezone as dj_tz
        raw = str(scheduled).strip()
        parsed = parse_datetime(raw.replace('Z', '+00:00'))
        if parsed is None and len(raw) == 16 and 'T' in raw:
            parsed = parse_datetime(f'{raw}:00')
        if parsed is not None:
            if dj_tz.is_naive(parsed):
                parsed = dj_tz.make_aware(parsed, dj_tz.get_current_timezone())
            kwargs['scheduled_publish_time'] = parsed.astimezone(dt_timezone.utc).strftime(
                '%Y-%m-%dT%H:%M:%SZ'
            )
        else:
            kwargs['scheduled_publish_time'] = scheduled

    altered = yt.get('altered_content')
    if altered is not None:
        kwargs['contains_synthetic_media'] = bool(altered)

    thumb_url = (yt.get('thumbnail_url') or '').strip() or None
    thumb_id = yt.get('thumbnail_asset_id')
    if not thumb_url and thumb_id is not None and resolve_thumbnail_url:
        try:
            thumb_url = resolve_thumbnail_url(int(thumb_id))
        except (TypeError, ValueError):
            thumb_url = resolve_thumbnail_url(thumb_id) if thumb_id else None
    if thumb_url:
        kwargs['thumbnail'] = thumb_url

    # Strip Nones so publisher defaults apply cleanly
    return {k: v for k, v in kwargs.items() if v is not None}
