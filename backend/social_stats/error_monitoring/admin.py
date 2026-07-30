# ============================================================================
#  Django admin for ErrorLog
# ============================================================================
from __future__ import annotations

import csv
import io
from datetime import timedelta

from django.contrib import admin, messages
from django.http import HttpResponse
from django.utils import timezone

from .models import ErrorLog


def _export_csv(queryset):
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([
        'id', 'created_at', 'severity', 'exception_type', 'exception_message',
        'request_path', 'username', 'resolved',
    ])
    for row in queryset.iterator():
        writer.writerow([
            row.id, row.created_at.isoformat(), row.severity, row.exception_type,
            (row.exception_message or '')[:500], row.request_path, row.username, row.resolved,
        ])
    response = HttpResponse(buffer.getvalue(), content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="error_logs.csv"'
    return response


def _export_xlsx(queryset):
    try:
        from openpyxl import Workbook
    except ImportError:
        return None
    wb = Workbook()
    ws = wb.active
    ws.title = 'ErrorLogs'
    ws.append([
        'id', 'created_at', 'severity', 'exception_type', 'exception_message',
        'request_path', 'username', 'resolved',
    ])
    for row in queryset.iterator():
        ws.append([
            str(row.id), row.created_at.isoformat(), row.severity, row.exception_type,
            (row.exception_message or '')[:500], row.request_path, row.username, row.resolved,
        ])
    out = io.BytesIO()
    wb.save(out)
    response = HttpResponse(
        out.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = 'attachment; filename="error_logs.xlsx"'
    return response


@admin.register(ErrorLog)
class ErrorLogAdmin(admin.ModelAdmin):
    list_display = [
        'created_at', 'severity', 'exception_type', 'request_path',
        'response_status_code', 'username', 'resolved',
    ]
    list_filter = ['severity', 'resolved', 'environment', 'exception_type', 'request_method']
    search_fields = [
        'id', 'exception_message', 'exception_type', 'request_path',
        'username', 'email', 'full_stack_trace', 'view_name', 'api_name',
    ]
    date_hierarchy = 'created_at'
    readonly_fields = [
        'id', 'created_at', 'application_name', 'environment', 'severity',
        'exception_type', 'exception_message', 'full_stack_trace',
        'python_file', 'function_name', 'class_name', 'line_number', 'source_module',
        'request_url', 'request_method', 'request_path', 'query_parameters',
        'request_body', 'http_headers', 'local_variables',
        'response_status_code', 'authenticated_user', 'username', 'email',
        'client_ip', 'user_agent', 'session_id', 'request_id',
        'workspace_id', 'organization_id', 'execution_time_ms',
        'server_hostname', 'process_id', 'thread_id', 'git_commit',
        'api_name', 'serializer_name', 'model_name', 'view_name',
        'database_query', 'database_error', 'suggestion', 'error_category',
        'resolved_at', 'resolved_by',
    ]
    actions = ['mark_resolved', 'export_selected_csv', 'export_selected_xlsx', 'delete_old_logs']

    fieldsets = (
        ('Summary', {
            'fields': (
                'id', 'created_at', 'severity', 'environment', 'application_name',
                'exception_type', 'exception_message', 'error_category', 'suggestion',
                'resolved', 'resolved_by', 'resolved_at', 'notes',
            ),
        }),
        ('Request', {
            'fields': (
                'request_method', 'request_path', 'request_url', 'response_status_code',
                'query_parameters', 'request_body', 'http_headers',
                'client_ip', 'user_agent', 'session_id', 'request_id',
                'workspace_id', 'organization_id', 'execution_time_ms',
            ),
        }),
        ('User', {'fields': ('authenticated_user', 'username', 'email')}),
        ('Trace', {
            'fields': (
                'full_stack_trace', 'python_file', 'function_name', 'class_name',
                'line_number', 'source_module', 'local_variables',
                'database_query', 'database_error',
            ),
        }),
        ('Context', {
            'fields': (
                'view_name', 'api_name', 'serializer_name', 'model_name',
                'server_hostname', 'process_id', 'thread_id', 'git_commit',
            ),
        }),
    )

    @admin.action(description='Mark selected as resolved')
    def mark_resolved(self, request, queryset):
        updated = queryset.filter(resolved=False).update(
            resolved=True,
            resolved_at=timezone.now(),
            resolved_by=request.user,
        )
        self.message_user(request, f'Marked {updated} log(s) resolved.', messages.SUCCESS)

    @admin.action(description='Export selected as CSV')
    def export_selected_csv(self, request, queryset):
        return _export_csv(queryset)

    @admin.action(description='Export selected as Excel')
    def export_selected_xlsx(self, request, queryset):
        resp = _export_xlsx(queryset)
        if resp is None:
            self.message_user(
                request,
                'openpyxl not installed — exported CSV instead.',
                messages.WARNING,
            )
            return _export_csv(queryset)
        return resp

    @admin.action(description='Delete logs older than 90 days (selected ignored)')
    def delete_old_logs(self, request, queryset):
        cutoff = timezone.now() - timedelta(days=90)
        deleted, _ = ErrorLog.objects.filter(created_at__lt=cutoff).delete()
        self.message_user(request, f'Deleted {deleted} log(s) older than 90 days.', messages.SUCCESS)
