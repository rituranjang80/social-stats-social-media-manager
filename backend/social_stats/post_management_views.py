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
from .publish_list_dates import filter_queryset_by_publish_date


def _sent_status_values():
    db_values = _status_values_in_db()
    for tab in PUBLISH_LIST_TAB_DEFS:
        if tab.get('id') == 'sent':
            return set(_intersect_match(tab.get('match'), db_values))
    return {'published', 'partial', 'failed', 'cancelled'}


def post_management_enabled_for_client(client) -> bool:
    cfg, _ = ClientPageConfig.objects.get_or_create(client=client)
    return bool(cfg.show_post_management)


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
        return Response({
            'client_id': client.id,
            'enabled': enabled,
            'can_view': can_view,
            'can_configure': can_configure,
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
            posts_by_date[date_key].append(enriched)

        for date_key in posts_by_date:
            posts_by_date[date_key].sort(
                key=lambda p: str(p.get('scheduled_at') or p.get('published_at') or p.get('created_at') or '')
            )

        return Response(dict(posts_by_date))


class PostManagementStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        from .models import UNIFIED_POST_STATUS_CHOICES, CALENDAR_STATUS_CHOICES

        client_id = request.data.get('client_id') or request.query_params.get('client_id')
        new_status = (request.data.get('status') or '').strip()
        source = (request.data.get('source') or 'composer').strip()

        if not client_id:
            return Response({'error': 'client_id is required.'}, status=400)
        if not new_status:
            return Response({'error': 'status is required.'}, status=400)

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
            post.status = new_status
            post.save(update_fields=['status', 'updated_at'])
            return Response(CalendarPostSerializer(post).data)

        if new_status not in unified_allowed:
            return Response({'error': f'Invalid status: {new_status}'}, status=400)
        try:
            post = UnifiedPost.objects.get(pk=pk, client=client)
        except UnifiedPost.DoesNotExist:
            return Response({'error': 'Post not found.'}, status=404)
        if post.status in _sent_status_values():
            return Response({'error': 'Sent posts cannot be changed here.'}, status=400)
        post.status = new_status
        post.updated_at = timezone.now()
        post.save(update_fields=['status', 'updated_at'])
        return Response(UnifiedPostListSerializer(post).data)
