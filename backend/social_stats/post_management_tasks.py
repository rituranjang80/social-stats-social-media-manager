# ============================================================================
#  Celery — Post Management monthly client digest emails.
# ============================================================================
from __future__ import annotations

import logging

from celery import shared_task
from django.conf import settings

from .post_management_digest import run_post_management_client_digests

logger = logging.getLogger(__name__)


@shared_task(name='social_stats.post_management_tasks.send_client_post_management_digests')
def send_client_post_management_digests():
    if not getattr(settings, 'POST_MANAGEMENT_DIGEST_ENABLED', False):
        logger.debug('POST_MANAGEMENT_DIGEST_ENABLED is false; skipping digest.')
        return {'skipped': True, 'reason': 'disabled'}
    result = run_post_management_client_digests(dry_run=False)
    logger.info('Post management client digests: %s', result)
    return result
