# ============================================================================
#  Post Management — upcoming posts list + status changes (workspace-gated).
# ============================================================================
from __future__ import annotations

from collections import defaultdict

from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .activity_logger import log_activity_for_request
from .calendar_views import (
    PUBLISH_LIST_TAB_DEFS,
    _check_client_access,
    _intersect_match,
    _status_values_in_db,
)
from .composer_serializers import UnifiedPostListSerializer
from .calendar_serializers import CalendarPostSerializer
from .models import UnifiedPost, CalendarPost, ClientPageConfig
from .permissions import PermissionChecker
from .post_management_models import PostManagementStatusChange
from .publish_list_dates import filter_queryset_by_publish_date

MAX_STATUS_COMMENT_LEN = 2000


def _sent_status_values():
    db_values = _status_values_in_db()
    for tab in PUBLISH_LIST_TAB_DEFS:
        if tab.get('id') == 'sent':
            return set(_intersect_match(tab.get('match'), db_values))
    return {'published', 'partial', 'failed', 'cancelled'}


def post_management_enabled_for_client(client) -> bool:
    cfg, _ = ClientPageConfig.objects.get_or_create(client=client)
    return bool(cfg.show_post_management)


def _can_view_status_log(profile) -> bool:
    if profile.role == 'superadmin':
        return True
    return PermissionChecker.has_permission(profile, 'post_management.view_status_log')


def _actor_snapshot(user) -> dict:
    if not user or not getattr(user, 'is_authenticated', False):
        return {}
    name = user.get_full_name() or user.username or ''
    return {
        'id': user.pk,
        'username': user.username,
        'email': user.email or '',
        'name': name,
    }


def _serialize_status_change(row: PostManagementStatusChange) -> dict:
    user = row.changed_by
    return {
        'id': row.pk,
        'post_source': row.post_source,
        'post_id': row.post_id,
        'from_status': row.from_status,
        'to_status': row.to_status,
        'comment': row.comment,
        'changed_at': row.changed_at.isoformat(),
        'changed_by': _actor_snapshot(user),
    }


def _latest_status_changes_for_client(client) -> dict[tuple[str, int], dict]:
    """Map (post_source, post_id) → latest change payload."""
    rows = (
        PostManagementStatusChange.objects.filter(client=client)
        .select_related('changed_by')
        .order_by('post_source', 'post_id', '-changed_at')
    )
    out: dict[tuple[str, int], dict] = {}
    for row in rows:
        key = (row.post_source, row.post_id)
        if key not in out:
            out[key] = _serialize_status_change(row)
    return out


def _record_status_change(
    *,
    request,
    client,
    post_source: str,
    post_id: int,
    from_status: str,
    to_status: str,
    comment: str,
) -> PostManagementStatusChange:
    row = PostManagementStatusChange.objects.create(
        client=client,
        post_source=post_source,
        post_id=post_id,
        from_status=from_status,
        to_status=to_status,
        comment=comment,
        changed_by=request.user,
    )
    actor = _actor_snapshot(request.user).get('name') or _actor_snapshot(request.user).get('username') or 'User'
    log_activity_for_request(
        request,
        client,
        action_type='post_management.status_change',
        description=(
            f'{actor} changed post status from {from_status} to {to_status}'
            + (f': {comment[:200]}' if comment else '')
        ),
        target_object_type=post_source,
        target_object_id=post_id,
        metadata={
            'from_status': from_status,
            'to_status': to_status,
            'comment': comment,
            'status_change_id': row.pk,
        },
    )
    return row


def _require_post_management(request, client_id):
    client, err = _check_client_access(request, client_id)
    if err:
        return None, err
    profile = request.user.profile
    if not PermissionChecker.has_permission(profile, 'post_management.view'):
        return None, Response({'error': 'Permission denied.'}, status=403)
    if not post_management_enabled_for_client(client):
        return None, Response(
            {'error': 'Post management is disabled for this workspace.', 'code': 'feature_disabled'},
            status=403,
        )
    return client, None


class PostManagementSettingsView(APIView):
    """Read whether post management is enabled for a workspace."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        client_id = request.query_params.get('client_id')
        if not client_id:
            return Response({'error': 'client_id is required.'}, status=400)
        client, err = _check_client_access(request, client_id)
        if err:
            return err
        profile = request.user.profile
        can_view = PermissionChecker.has_permission(profile, 'post_management.view')
        enabled = post_management_enabled_for_client(client)
        can_configure = (
            profile.role == 'superadmin'
            or PermissionChecker.has_permission(profile, 'post_management.configure')
        )
        can_change_status = PermissionChecker.has_permission(profile, 'post_management.change_status')
        can_view_status_log = _can_view_status_log(profile)
        return Response({
            'client_id': client.id,
            'enabled': enabled,
            'can_view': can_view,
            'can_configure': can_configure,
            'can_change_status': can_change_status,
            'can_view_status_log': can_view_status_log,
        })

    def put(self, request):
        client_id = request.data.get('client_id')
        if client_id is None:
            return Response({'error': 'client_id is required.'}, status=400)
        client, err = _check_client_access(request, client_id)
        if err:
            return err
        profile = request.user.profile
        can_configure = (
            profile.role == 'superadmin'
            or PermissionChecker.has_permission(profile, 'post_management.configure')
        )
        if not can_configure:
            return Response({'error': 'Permission denied.'}, status=403)
        if 'enabled' not in request.data:
            return Response({'error': 'enabled is required.'}, status=400)
        cfg, _ = ClientPageConfig.objects.get_or_create(client=client)
        cfg.show_post_management = bool(request.data.get('enabled'))
        cfg.updated_by = request.user
        cfg.save(update_fields=['show_post_management', 'updated_by', 'updated_at'])
        can_view = PermissionChecker.has_permission(profile, 'post_management.view')
        return Response({
            'client_id': client.id,
            'enabled': cfg.show_post_management,
            'can_view': can_view,
            'can_configure': can_configure,
            'can_change_status': PermissionChecker.has_permission(profile, 'post_management.change_status'),
            'can_view_status_log': _can_view_status_log(profile),
        })


class PostManagementPostsView(APIView):
    """Upcoming posts for the post management UI (composer + legacy calendar)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        client_id = request.query_params.get('client_id')
        if not client_id:
            return Response({'error': 'client_id is required.'}, status=400)
        client, err = _require_post_management(request, client_id)
        if err:
            return err

        profile = request.user.profile
        include_log = _can_view_status_log(profile)
        latest_map = _latest_status_changes_for_client(client) if include_log else {}

        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        sent = _sent_status_values()

        uqs = UnifiedPost.objects.filter(client=client).exclude(status__in=sent)
        uqs = filter_queryset_by_publish_date(uqs, date_from, date_to)
        uqs = uqs.prefetch_related('publish_logs', 'media_assets').order_by('scheduled_at', 'created_at')

        cqs = CalendarPost.objects.filter(client=client).exclude(status__in=sent)
        if date_from or date_to:
            from .publish_list_dates import parse_publish_date_range
            start, end = parse_publish_date_range(date_from, date_to)
            if start and end:
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
        cqs = cqs.select_related('client', 'created_by').order_by('scheduled_at', 'created_at')

        posts_by_date = defaultdict(list)

        for row in UnifiedPostListSerializer(uqs, many=True).data:
            dt = row.get('scheduled_at') or row.get('published_at') or row.get('created_at')
            if not dt:
                continue
            date_key = str(dt)[:10]
            enriched = {**row, 'source': 'composer', 'calendarKey': f"composer-{row['id']}"}
            if include_log:
                enriched['latest_status_change'] = latest_map.get(('composer', row['id']))
            posts_by_date[date_key].append(enriched)

        for row in CalendarPostSerializer(cqs, many=True).data:
            dt = row.get('scheduled_at') or row.get('published_at')
            if not dt:
                continue
            date_key = str(dt)[:10]
            enriched = {
                **row,
                'source': 'calendar',
                'calendarKey': f"calendar-{row['id']}",
                'platforms': [row['platform']] if row.get('platform') else [],
            }
            if include_log:
                enriched['latest_status_change'] = latest_map.get(('calendar', row['id']))
            posts_by_date[date_key].append(enriched)

        for date_key in posts_by_date:
            posts_by_date[date_key].sort(
                key=lambda p: str(p.get('scheduled_at') or p.get('published_at') or p.get('created_at') or '')
            )

        return Response(dict(posts_by_date))


class PostManagementStatusLogView(APIView):
    """Paginated status change history for analysis (RBAC: post_management.view_status_log)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        client_id = request.query_params.get('client_id')
        if not client_id:
            return Response({'error': 'client_id is required.'}, status=400)
        client, err = _require_post_management(request, client_id)
        if err:
            return err
        profile = request.user.profile
        if not _can_view_status_log(profile):
            return Response({'error': 'Permission denied.'}, status=403)

        qs = PostManagementStatusChange.objects.filter(client=client).select_related('changed_by')
        post_id = request.query_params.get('post_id')
        post_source = request.query_params.get('post_source')
        if post_id and post_source:
            qs = qs.filter(post_id=int(post_id), post_source=post_source)
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(changed_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(changed_at__date__lte=date_to)

        try:
            limit = min(int(request.query_params.get('limit', 100)), 500)
        except ValueError:
            limit = 100
        rows = qs.order_by('-changed_at')[:limit]
        return Response({
            'results': [_serialize_status_change(r) for r in rows],
            'count': len(rows),
        })


class PostManagementStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        from .models import UNIFIED_POST_STATUS_CHOICES, CALENDAR_STATUS_CHOICES

        client_id = request.data.get('client_id') or request.query_params.get('client_id')
        new_status = (request.data.get('status') or '').strip()
        source = (request.data.get('source') or 'composer').strip()
        comment = (request.data.get('comment') or '').strip()

        if not client_id:
            return Response({'error': 'client_id is required.'}, status=400)
        if not new_status:
            return Response({'error': 'status is required.'}, status=400)
        if not comment:
            return Response({'error': 'comment is required when changing status.'}, status=400)
        if len(comment) > MAX_STATUS_COMMENT_LEN:
            return Response(
                {'error': f'comment must be at most {MAX_STATUS_COMMENT_LEN} characters.'},
                status=400,
            )

        unified_allowed = {c for c, _ in UNIFIED_POST_STATUS_CHOICES}
        calendar_allowed = {c for c, _ in CALENDAR_STATUS_CHOICES}

        client, err = _require_post_management(request, client_id)
        if err:
            return err

        profile = request.user.profile
        if not PermissionChecker.has_permission(profile, 'post_management.change_status'):
            return Response({'error': 'Permission denied.'}, status=403)

        if source == 'calendar':
            if new_status not in calendar_allowed:
                return Response({'error': f'Invalid status: {new_status}'}, status=400)
            try:
                post = CalendarPost.objects.get(pk=pk, client=client)
            except CalendarPost.DoesNotExist:
                return Response({'error': 'Post not found.'}, status=404)
            if post.status == 'published':
                return Response({'error': 'Published posts cannot be changed here.'}, status=400)
            old_status = post.status
            if old_status == new_status:
                return Response({'error': 'Status is unchanged.'}, status=400)
            post.status = new_status
            post.save(update_fields=['status', 'updated_at'])
            change = _record_status_change(
                request=request,
                client=client,
                post_source='calendar',
                post_id=post.pk,
                from_status=old_status,
                to_status=new_status,
                comment=comment,
            )
            data = CalendarPostSerializer(post).data
            if _can_view_status_log(profile):
                data['latest_status_change'] = _serialize_status_change(change)
            return Response(data)

        if new_status not in unified_allowed:
            return Response({'error': f'Invalid status: {new_status}'}, status=400)
        try:
            post = UnifiedPost.objects.get(pk=pk, client=client)
        except UnifiedPost.DoesNotExist:
            return Response({'error': 'Post not found.'}, status=404)
        if post.status in _sent_status_values():
            return Response({'error': 'Sent posts cannot be changed here.'}, status=400)
        old_status = post.status
        if old_status == new_status:
            return Response({'error': 'Status is unchanged.'}, status=400)
        post.status = new_status
        post.updated_at = timezone.now()
        post.save(update_fields=['status', 'updated_at'])
        change = _record_status_change(
            request=request,
            client=client,
            post_source='composer',
            post_id=post.pk,
            from_status=old_status,
            to_status=new_status,
            comment=comment,
        )
        data = UnifiedPostListSerializer(post).data
        if _can_view_status_log(profile):
            data['latest_status_change'] = _serialize_status_change(change)
        return Response(data)
