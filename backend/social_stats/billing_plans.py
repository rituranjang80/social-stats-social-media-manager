# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Plan catalog with per-tier AI generation quotas (text / image / video).
# ============================================================================
from __future__ import annotations


def _plan(sku: str, side: str, label: str, *, text: int | None, image: int | None, video: int | None) -> dict:
    return {
        'sku': sku,
        'side': side,
        'label': label,
        'price': 0,
        'currency': 'INR',
        'features': [
            f'Text AI: {"unlimited" if text is None else text}/month',
            f'Image AI: {"unlimited" if image is None else image}/month',
            f'Video AI: {"unlimited" if video is None else video}/month',
        ],
        'limits': {
            'workspaces': None,
            'connected_platforms': None,
            'posts_per_month': None,
            'ai_generations_per_month': None,
            'ai_text_generations_per_month': text,
            'ai_image_generations_per_month': image,
            'ai_video_generations_per_month': video,
            'analytics_history_days': None,
            'active_relations': None,
            'managed_clients': None,
        },
    }


# End-user tiers — Free / Lite / Pro / Enterprise
EU_FREE = _plan('eu-free', 'end_user', 'Free', text=4, image=1, video=2)
EU_LITE = _plan('eu-lite', 'end_user', 'Lite', text=20, image=5, video=10)
EU_PRO = _plan('eu-pro', 'end_user', 'Pro', text=100, image=30, video=60)
EU_ENTERPRISE = _plan('eu-premium', 'end_user', 'Enterprise', text=None, image=None, video=None)

# Agency tiers (higher defaults)
AGENCY_STARTER = _plan('agency-starter', 'agency', 'Starter', text=50, image=15, video=30)
AGENCY_GROWTH = _plan('agency-growth', 'agency', 'Growth', text=200, image=60, video=120)
AGENCY_SCALE = _plan('agency-scale', 'agency', 'Scale', text=500, image=150, video=300)
AGENCY_ENTERPRISE = _plan('agency-enterprise', 'agency', 'Enterprise', text=None, image=None, video=None)

PLANS = {
    p['sku']: p for p in [
        EU_FREE, EU_LITE, EU_PRO, EU_ENTERPRISE,
        AGENCY_STARTER, AGENCY_GROWTH, AGENCY_SCALE, AGENCY_ENTERPRISE,
    ]
}


def get_plan(sku: str) -> dict:
    return PLANS.get(sku) or EU_FREE


def list_plans(side: str | None = None) -> list[dict]:
    if side:
        return [p for p in PLANS.values() if p['side'] == side]
    return list(PLANS.values())


def get_limit(sku: str, key: str):
    plan = get_plan(sku)
    if key in plan['limits']:
        return plan['limits'][key]
    return None
