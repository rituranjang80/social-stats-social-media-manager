# ============================================================================
#  Post Management — status buckets, counts, client digest emails.
# ============================================================================
from __future__ import annotations

import html
import logging
from datetime import date, timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Q

from .models import CalendarPost, Client, UnifiedPost
from .post_management_views import post_management_enabled_for_client, _sent_status_values
from .publish_list_dates import filter_queryset_by_publish_date, parse_publish_date_range
from .welcome_email_service import app_branding, render_templated_email

logger = logging.getLogger(__name__)

FROM_EMAIL = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@socialstats.app')

# Align with Post Management UI default filters (calendar post-status ids).
PM_STAT_BUCKETS = (
    ('draft', 'Draft', {'draft'}),
    ('pending_review', 'Pending Review', {'pending_review', 'pending_approval', 'pending_client'}),
    ('on_hold', 'On Hold', {'on_hold', 'queued'}),
)


def _bucket_for_status(raw_status: str) -> str | None:
    s = (raw_status or '').strip().lower()
    for bucket_id, _label, match in PM_STAT_BUCKETS:
        if s in match:
            return bucket_id
    return None


def digest_date_range(*, lookback_days: int | None = None) -> tuple[date, date]:
    days = lookback_days
    if days is None:
        days = int(getattr(settings, 'POST_MANAGEMENT_DIGEST_LOOKBACK_DAYS', 30))
    end = date.today()
    start = end - timedelta(days=max(1, days))
    return start, end


def _calendar_posts_in_range(client, start: date, end: date):
    sent = _sent_status_values()
    cqs = CalendarPost.objects.filter(client=client).exclude(status__in=sent)
    cqs = cqs.filter(
        Q(scheduled_at__date__gte=start, scheduled_at__date__lte=end)
        | Q(published_at__date__gte=start, published_at__date__lte=end)
        | Q(
            scheduled_at__isnull=True,
            published_at__isnull=True,
            created_at__date__gte=start,
            created_at__date__lte=end,
        )
    )
    return cqs.values_list('status', flat=True)


def _composer_posts_in_range(client, start: date, end: date):
    sent = _sent_status_values()
    uqs = UnifiedPost.objects.filter(client=client).exclude(status__in=sent)
    uqs = filter_queryset_by_publish_date(
        uqs,
        start.isoformat(),
        end.isoformat(),
    )
    return uqs.values_list('status', flat=True)


def count_post_management_buckets(client, start: date, end: date) -> dict[str, int]:
    counts = {bucket_id: 0 for bucket_id, _label, _match in PM_STAT_BUCKETS}
    for status in list(_composer_posts_in_range(client, start, end)) + list(
        _calendar_posts_in_range(client, start, end)
    ):
        bucket = _bucket_for_status(status)
        if bucket:
            counts[bucket] = counts.get(bucket, 0) + 1
    return counts


def _stats_html_table(counts: dict[str, int], start: date, end: date) -> str:
    rows = []
    for bucket_id, label, _match in PM_STAT_BUCKETS:
        n = counts.get(bucket_id, 0)
        rows.append(
            f'<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">{html.escape(label)}</td>'
            f'<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;">{n}</td></tr>'
        )
    return (
        f'<table width="100%" cellpadding="0" cellspacing="0" '
        f'style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:12px 0;">'
        f'<tr><td colspan="2" style="padding:10px 12px;background:#f8fafc;font-size:13px;font-weight:700;">'
        f'Period: {start.isoformat()} – {end.isoformat()}</td></tr>'
        + ''.join(rows)
        + '</table>'
    )


def build_client_approval_context(client: Client, counts: dict[str, int], start: date, end: date) -> dict:
    b = app_branding()
    frontend = b['frontend_url'].rstrip('/')
    total = sum(counts.values())
    client_name = client.name or client.company or client.email.split('@')[0]
    return {
        **b,
        'client_name': client_name,
        'client_email': client.email,
        'period_from': start.isoformat(),
        'period_to': end.isoformat(),
        'draft_count': str(counts.get('draft', 0)),
        'pending_review_count': str(counts.get('pending_review', 0)),
        'on_hold_count': str(counts.get('on_hold', 0)),
        'total_count': str(total),
        'stats_html': _stats_html_table(counts, start, end),
        'post_management_url': f'{frontend}/dashboard/analytics/post-management',
        'login_url': f'{frontend}/login',
        'current_year': str(end.year),
    }


def send_client_post_management_digest(client: Client, *, start: date, end: date, dry_run: bool = False) -> bool:
    if not client.is_active or client.is_deleted:
        return False
    if not post_management_enabled_for_client(client):
        return False
    if not client.email:
        return False

    counts = count_post_management_buckets(client, start, end)
    if sum(counts.values()) <= 0:
        return False

    ctx = build_client_approval_context(client, counts, start, end)
    subject, plain, html_out = render_templated_email(
        'client-approval',
        ctx,
        plain_fallback=(
            'Hello {{client_name}},\n\n'
            'Draft: {{draft_count}}, Pending Review: {{pending_review_count}}, On Hold: {{on_hold_count}}\n'
            'Open: {{post_management_url}}\n'
        ),
    )
    if dry_run:
        logger.info(
            'Dry-run digest for client %s (%s): %s',
            client.pk,
            client.email,
            counts,
        )
        return True

    try:
        sent = send_mail(
            subject,
            plain,
            FROM_EMAIL,
            [client.email],
            html_message=html_out,
            fail_silently=False,
        )
        return sent == 1
    except Exception:
        logger.exception('Post management digest failed for client %s', client.pk)
        return False


def run_post_management_client_digests(*, dry_run: bool = False) -> dict:
    start, end = digest_date_range()
    sent = 0
    skipped = 0
    errors = 0

    clients = Client.objects.filter(is_active=True, is_deleted=False).order_by('id')
    for client in clients:
        counts = count_post_management_buckets(client, start, end)
        if sum(counts.values()) <= 0:
            skipped += 1
            continue
        ok = send_client_post_management_digest(client, start=start, end=end, dry_run=dry_run)
        if ok:
            sent += 1
        else:
            errors += 1

    return {
        'period_from': start.isoformat(),
        'period_to': end.isoformat(),
        'sent': sent,
        'skipped_no_posts': skipped,
        'errors': errors,
        'dry_run': dry_run,
    }
