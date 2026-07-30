# ============================================================================
#  Error log REST API (staff / superadmin)
# ============================================================================
from __future__ import annotations

from django.db.models import Q
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import ErrorLog
from .permissions import IsStaffOrSuperadmin
from .serializers import (
    ErrorLogDetailSerializer,
    ErrorLogListSerializer,
    ErrorLogResolveSerializer,
)


class ErrorLogViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsStaffOrSuperadmin]
    lookup_field = 'pk'

    def get_queryset(self):
        qs = ErrorLog.objects.all().select_related('authenticated_user', 'resolved_by')
        params = self.request.query_params

        severity = params.get('severity')
        if severity:
            qs = qs.filter(severity__iexact=severity.strip())

        if params.get('resolved') in ('true', 'false'):
            qs = qs.filter(resolved=params['resolved'] == 'true')

        user = params.get('user') or params.get('username')
        if user:
            qs = qs.filter(Q(username__icontains=user) | Q(email__icontains=user))

        api = params.get('api') or params.get('api_name')
        if api:
            qs = qs.filter(Q(api_name__icontains=api) | Q(view_name__icontains=api))

        date_from = params.get('date_from')
        date_to = params.get('date_to')
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        search = params.get('search')
        if search:
            qs = qs.filter(
                Q(exception_message__icontains=search)
                | Q(exception_type__icontains=search)
                | Q(request_path__icontains=search)
                | Q(full_stack_trace__icontains=search)
            )

        ordering = params.get('ordering', '-created_at')
        allowed = {
            'created_at', '-created_at', 'severity', '-severity',
            'exception_type', '-exception_type', 'request_path', '-request_path',
        }
        if ordering in allowed:
            qs = qs.order_by(ordering)
        else:
            qs = qs.order_by('-created_at')
        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ErrorLogDetailSerializer
        if self.action == 'resolve':
            return ErrorLogResolveSerializer
        return ErrorLogListSerializer

    @action(detail=True, methods=['post'], url_path='resolve')
    def resolve(self, request, pk=None):
        log = self.get_object()
        ser = ErrorLogResolveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        log.resolved = True
        log.resolved_by = request.user
        log.resolved_at = timezone.now()
        if ser.validated_data.get('notes'):
            log.notes = ser.validated_data['notes']
        log.save(update_fields=['resolved', 'resolved_by', 'resolved_at', 'notes'])
        return Response(ErrorLogDetailSerializer(log).data)
