# ============================================================================
#  ErrorLog model — persisted exception records
# ============================================================================
from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models

from .constants import ENVIRONMENT_CHOICES, SEVERITY_CHOICES


class ErrorLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    application_name = models.CharField(max_length=128, db_index=True, blank=True)
    environment = models.CharField(max_length=32, choices=ENVIRONMENT_CHOICES, default='Development', db_index=True)
    severity = models.CharField(max_length=16, choices=SEVERITY_CHOICES, default='ERROR', db_index=True)

    exception_type = models.CharField(max_length=255, db_index=True)
    exception_message = models.TextField(blank=True)
    full_stack_trace = models.TextField(blank=True)

    python_file = models.TextField(blank=True)
    function_name = models.CharField(max_length=255, blank=True)
    class_name = models.CharField(max_length=255, blank=True)
    line_number = models.PositiveIntegerField(null=True, blank=True)
    source_module = models.CharField(max_length=255, blank=True)

    request_url = models.TextField(blank=True)
    request_method = models.CharField(max_length=16, blank=True, db_index=True)
    request_path = models.CharField(max_length=512, blank=True, db_index=True)
    query_parameters = models.JSONField(default=dict, blank=True)
    request_body = models.JSONField(default=dict, blank=True)
    http_headers = models.JSONField(default=dict, blank=True)
    local_variables = models.JSONField(default=dict, blank=True)

    response_status_code = models.PositiveSmallIntegerField(null=True, blank=True, db_index=True)

    authenticated_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='error_logs',
    )
    username = models.CharField(max_length=150, blank=True, db_index=True)
    email = models.EmailField(blank=True)

    client_ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    session_id = models.CharField(max_length=64, blank=True)
    request_id = models.UUIDField(null=True, blank=True, db_index=True)

    workspace_id = models.CharField(max_length=64, blank=True, db_index=True)
    organization_id = models.CharField(max_length=64, blank=True, db_index=True)

    execution_time_ms = models.PositiveIntegerField(null=True, blank=True)
    server_hostname = models.CharField(max_length=255, blank=True)
    process_id = models.PositiveIntegerField(null=True, blank=True)
    thread_id = models.BigIntegerField(null=True, blank=True)
    git_commit = models.CharField(max_length=64, blank=True)

    api_name = models.CharField(max_length=255, blank=True, db_index=True)
    serializer_name = models.CharField(max_length=255, blank=True)
    model_name = models.CharField(max_length=255, blank=True)
    view_name = models.CharField(max_length=255, blank=True, db_index=True)

    database_query = models.TextField(blank=True)
    database_error = models.TextField(blank=True)

    suggestion = models.TextField(blank=True)
    error_category = models.CharField(max_length=128, blank=True, db_index=True)

    resolved = models.BooleanField(default=False, db_index=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_error_logs',
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    screenshot_path = models.CharField(
        max_length=512,
        blank=True,
        help_text='Relative path under MEDIA_ROOT (e.g. error_screenshots/<id>.png)',
    )

    class Meta:
        app_label = 'social_stats'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['severity', '-created_at']),
            models.Index(fields=['resolved', '-created_at']),
            models.Index(fields=['exception_type', '-created_at']),
        ]

    def __str__(self) -> str:
        return f'ErrorLog<{self.exception_type} {self.id}>'
