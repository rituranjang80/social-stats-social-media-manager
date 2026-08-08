# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""
Seed composer + legacy calendar posts for Publish calendar QA.

Creates 4 posts per status with schedule/publish/created dates in Oct–Dec
(after September) so month/list/approval filters can be tested.

Usage:
  python manage.py seed_calendar_status_posts
  python manage.py seed_calendar_status_posts --client=<uuid-or-pk>
  python manage.py seed_calendar_status_posts --replace
"""
from __future__ import annotations

from datetime import datetime

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from social_stats.client_ref import resolve_client_pk
from social_stats.models import (
    CALENDAR_STATUS_CHOICES,
    UNIFIED_POST_STATUS_CHOICES,
    CalendarPost,
    Client,
    UnifiedPost,
)

SEED_TAG = 'calendar-demo-seed'
TITLE_PREFIX = '[Demo Calendar]'

# Oct / Oct / Nov / Dec — all after September
DATE_SLOTS = [
    (10, 5, 9),
    (10, 19, 14),
    (11, 7, 10),
    (12, 12, 16),
]

PLATFORMS = ['facebook', 'instagram', 'linkedin', 'youtube']


def _slot_dt(year: int, slot_index: int) -> datetime:
    month, day, hour = DATE_SLOTS[slot_index]
    naive = datetime(year, month, day, hour, 0, 0)
    return timezone.make_aware(naive)


def _apply_timestamps(post: UnifiedPost, status: str, when: datetime) -> None:
    post.scheduled_at = None
    post.published_at = None
    if status in ('published', 'partial'):
        post.published_at = when
        post.scheduled_at = when
    elif status == 'draft':
        UnifiedPost.objects.filter(pk=post.pk).update(created_at=when)
        return
    else:
        post.scheduled_at = when
    post.save(update_fields=['scheduled_at', 'published_at', 'updated_at'])


class Command(BaseCommand):
    help = 'Seed 4 calendar demo posts per post status (dates after September)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--client',
            type=str,
            default=None,
            help='Client pk or public UUID (default: first active client)',
        )
        parser.add_argument(
            '--year',
            type=int,
            default=2026,
            help='Calendar year for demo dates (default: 2026)',
        )
        parser.add_argument(
            '--replace',
            action='store_true',
            help='Remove previous demo posts (tag calendar-demo-seed) for this client',
        )
        parser.add_argument(
            '--legacy-calendar',
            action='store_true',
            help='Also seed 4 legacy CalendarPost rows per calendar status',
        )

    def handle(self, *args, **options):
        year = options['year']
        client = self._resolve_client(options['client'])
        if not client:
            self.stderr.write(self.style.ERROR('No client found. Pass --client=<uuid-or-pk>.'))
            return

        author = User.objects.filter(is_active=True).order_by('id').first()

        if options['replace']:
            removed_u = UnifiedPost.objects.filter(
                client=client,
                title__startswith=TITLE_PREFIX,
            ).delete()[0]
            removed_c = CalendarPost.objects.filter(
                client=client,
                title__startswith=TITLE_PREFIX,
            ).delete()[0]
            self.stdout.write(f'Removed {removed_u} composer + {removed_c} legacy demo posts.')

        composer_statuses = [s[0] for s in UNIFIED_POST_STATUS_CHOICES]
        created = 0

        for status in composer_statuses:
            for i in range(4):
                when = _slot_dt(year, i)
                platform = PLATFORMS[i % len(PLATFORMS)]
                title = f'{TITLE_PREFIX} {status.replace("_", " ").title()} #{i + 1}'
                content = (
                    f'Demo {status} post for calendar QA. '
                    f'Anchor: {when.strftime("%Y-%m-%d %H:%M")} (after September {year}).'
                )
                post = UnifiedPost.objects.create(
                    client=client,
                    created_by=author,
                    title=title,
                    content=content,
                    tags=[SEED_TAG, f'demo-status-{status}'],
                    media_type='text',
                    target_platforms=[platform],
                    status=status,
                )
                _apply_timestamps(post, status, when)
                created += 1

            self.stdout.write(f'  ✓ composer/{status}: 4 posts')

        if options['legacy_calendar']:
            for status, _label in CALENDAR_STATUS_CHOICES:
                for i in range(4):
                    when = _slot_dt(year, i)
                    platform = PLATFORMS[i % len(PLATFORMS)]
                    title = f'{TITLE_PREFIX} legacy {status} #{i + 1}'
                    CalendarPost.objects.create(
                        client=client,
                        platform=platform,
                        status=status,
                        title=title,
                        caption=f'Legacy calendar {status} demo ({when.date()}).',
                        scheduled_at=when if status != 'published' else None,
                        published_at=when if status == 'published' else None,
                    )
                    created += 1
                self.stdout.write(f'  ✓ calendar/{status}: 4 posts')

        self.stdout.write(
            self.style.SUCCESS(
                f'\nCreated {created} demo posts for {client.company} (id={client.pk}). '
                f'Browse calendar Oct–Dec {year} or List mode tabs.'
            ),
        )

    def _resolve_client(self, ref: str | None) -> Client | None:
        if ref:
            pk = resolve_client_pk(ref)
            if pk:
                return Client.objects.filter(pk=pk, is_active=True).first()
            return None
        return Client.objects.filter(is_active=True).order_by('id').first()
