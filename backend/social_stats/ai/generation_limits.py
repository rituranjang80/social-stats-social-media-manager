# ============================================================================
#  AI generation limits by subscription tier (text / image / video).
# ============================================================================
from __future__ import annotations

from django.utils import timezone

from ..billing_plans import get_plan, get_limit
from ..models import AIUsageLog, Client
from ..usage_limits import get_or_create_subscription, _period_start

TEXT_FEATURES = frozenset({
    'compose', 'rewrite', 'extend', 'summarize', 'hashtag_research',
    'title_generator', 'post_improve', 'caption', 'hashtags', 'compose_post',
    'content_calendar', 'suggest_hashtags', 'suggest_reply', 'translate',
})

IMAGE_FEATURES = frozenset({
    'image_to_post', 'describe_image', 'alt_text', 'brand_compliance_check',
    'image_caption', 'generate_image_caption',
})

VIDEO_FEATURES = frozenset({
    'video_script', 'video_captions', 'video_chapters', 'video_summary',
})

GENERATION_TYPES = ('text', 'image', 'video')

FEATURES_BY_TYPE = {
    'text': TEXT_FEATURES,
    'image': IMAGE_FEATURES,
    'video': VIDEO_FEATURES,
}

LIMIT_KEYS = {
    'text': 'ai_text_generations_per_month',
    'image': 'ai_image_generations_per_month',
    'video': 'ai_video_generations_per_month',
}


def _count_type(client: Client, gen_type: str) -> int:
    sub = get_or_create_subscription(client)
    since = _period_start(sub)
    features = FEATURES_BY_TYPE[gen_type]
    return AIUsageLog.objects.filter(
        client=client,
        created_at__gte=since,
        feature__in=features,
    ).count()


def get_generation_usage(client: Client) -> dict:
    """Subscription plan + per-type usage for the composer AI modal."""
    sub = get_or_create_subscription(client)
    plan = get_plan(sub.plan)
    tiers = []
    for gen_type in GENERATION_TYPES:
        key = LIMIT_KEYS[gen_type]
        limit = get_limit(sub.plan, key)
        current = _count_type(client, gen_type)
        tiers.append({
            'type': gen_type,
            'key': key,
            'current': current,
            'limit': limit,
            'remaining': None if limit is None else max(0, limit - current),
            'percent': None if limit in (None, 0) else round(min(100, current * 100 / limit), 1),
        })
    return {
        'plan': sub.plan,
        'plan_label': plan['label'],
        'period_start': _period_start(sub).isoformat(),
        'generations': tiers,
    }


def check_generation_limit(client: Client, gen_type: str, *, increment: int = 1) -> tuple[bool, str | None, dict]:
    """Returns (ok, reason_if_blocked, info)."""
    if gen_type not in GENERATION_TYPES:
        return False, 'invalid generation type', {}

    sub = get_or_create_subscription(client)
    key = LIMIT_KEYS[gen_type]
    limit = get_limit(sub.plan, key)
    current = _count_type(client, gen_type)

    info = {
        'type': gen_type,
        'current': current,
        'limit': limit,
        'plan': sub.plan,
        'plan_label': get_plan(sub.plan)['label'],
    }

    if limit is None:
        return True, None, info

    if limit == 0:
        return False, f'{gen_type.title()} AI is not included on your {info["plan_label"]} plan.', info

    if current + increment > limit:
        remaining = max(0, limit - current)
        return (
            False,
            f'{gen_type.title()} generation limit reached ({limit}/month on {info["plan_label"]}). '
            f'{remaining} remaining.',
            info,
        )

    return True, None, info
