# ============================================================================
#  Unified composer AI generation — text, image, video, or all.
# ============================================================================
from __future__ import annotations

import logging

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..ai_helpers import brand_voice_prompt
from ..ai_views import _resolved_client
from . import AIClient, AIError, RateLimited, prompts
from .access import require_ai_compose
from .content_views import _ai_call_json, _error_response
from .generation_limits import check_generation_limit, get_generation_usage
from .image_views import _resolve_image_payload, _vision_json

logger = logging.getLogger(__name__)

VALID_TYPES = frozenset({'text', 'image', 'video', 'all'})


def _normalize_types(raw) -> list[str]:
    if raw == 'all' or (isinstance(raw, list) and 'all' in raw):
        return ['text', 'image', 'video']
    if isinstance(raw, str):
        return [raw] if raw in ('text', 'image', 'video') else []
    if isinstance(raw, list):
        return [t for t in raw if t in ('text', 'image', 'video')]
    return ['text']


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generation_limits(request):
    """Per-client subscription quotas for composer AI (text/image/video)."""
    denied = require_ai_compose(request)
    if denied:
        return denied
    client, err = _resolved_client(request)
    if err:
        return err
    return Response(get_generation_usage(client))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def composer_generate(request):
    """
    Generate text captions, image posts, and/or video scripts in one request.

    Body:
        client_id, topic, types: 'text'|'image'|'video'|'all'|[],
        platforms[], tone, length, language, cta, extra_notes,
        image_url?, image_b64?, duration_seconds?
    """
    denied = require_ai_compose(request)
    if denied:
        return denied

    client, err = _resolved_client(request)
    if err:
        return err

    topic = (request.data.get('topic') or '').strip()
    if not topic:
        return Response({'error': 'topic is required'}, status=400)

    types = _normalize_types(request.data.get('types') or 'text')
    if not types:
        return Response({'error': 'types must include text, image, video, or all'}, status=400)

    platforms = request.data.get('platforms') or ['instagram']
    tone = request.data.get('tone') or 'friendly'
    length = request.data.get('length') or 'medium'
    language = request.data.get('language') or 'English'
    cta = (request.data.get('cta') or '').strip()
    extra_notes = (request.data.get('extra_notes') or '').strip()
    duration_seconds = int(request.data.get('duration_seconds', 30) or 30)
    platform = platforms[0] if platforms else 'instagram'

    for gen_type in types:
        ok, reason, _info = check_generation_limit(client, gen_type)
        if not ok:
            return Response({'error': reason, 'blocked_type': gen_type, 'usage': get_generation_usage(client)}, status=402)

    result = {}
    errors = {}

    if 'text' in types:
        ai = AIClient(client=client, user=request.user, feature='compose')
        try:
            data = _ai_call_json(
                ai=ai, template='compose',
                topic=topic, platforms=platforms, tone=tone, length=length,
                include_hashtags=True, include_emojis=True,
                language=language, cta=cta, extra_notes=extra_notes,
                brand_voice=brand_voice_prompt(client),
            )
            result['text'] = data
        except (AIError, RateLimited) as e:
            errors['text'] = str(e)

    if 'image' in types:
        has_image = bool(request.data.get('image_url') or request.data.get('image_b64'))
        try:
            if has_image:
                b64, media_type = _resolve_image_payload(request)
                ai = AIClient(client=client, user=request.user, feature='image_to_post')
                data = _vision_json(
                    ai=ai, template='image_to_post',
                    b64=b64, media_type=media_type,
                    platforms=platforms, tone=tone,
                    extra_notes=extra_notes or topic,
                    language=language,
                    brand_voice=brand_voice_prompt(client),
                )
                result['image'] = data
            else:
                ai = AIClient(client=client, user=request.user, feature='image_caption')
                data = _ai_call_json(
                    ai=ai, template='compose',
                    topic=topic, platforms=platforms, tone=tone, length=length,
                    include_hashtags=True, include_emojis=True,
                    language=language, cta=cta,
                    extra_notes=(
                        (extra_notes + '\n\n') if extra_notes else ''
                    ) + 'Write an image-post caption. Include a short visual concept the designer could shoot.',
                    brand_voice=brand_voice_prompt(client),
                )
                variants = data.get('variants') or []
                result['image'] = {
                    'mode': 'caption',
                    'visual_concept': topic,
                    'posts': [{
                        'platform': v.get('platform') or platform,
                        'content': v.get('content') or '',
                        'hashtags': v.get('hashtags') or [],
                    } for v in variants],
                }
        except (AIError, RateLimited) as e:
            errors['image'] = str(e)
        except Exception as e:
            errors['image'] = str(e)

    if 'video' in types:
        ai = AIClient(client=client, user=request.user, feature='video_script')
        try:
            data = _ai_call_json(
                ai=ai, template='video_script',
                topic=topic,
                duration_seconds=duration_seconds,
                platform=platform,
                hook_style=request.data.get('hook_style', 'question'),
                cta=cta,
                language=language,
                brand_voice=brand_voice_prompt(client),
            )
            result['video'] = data
        except (AIError, RateLimited) as e:
            errors['video'] = str(e)

    if not result and errors:
        first = next(iter(errors.values()))
        return Response({'error': first, 'errors': errors, 'usage': get_generation_usage(client)}, status=503)

    return Response({
        'topic': topic,
        'types': types,
        'results': result,
        'errors': errors or None,
        'usage': get_generation_usage(client),
    })
