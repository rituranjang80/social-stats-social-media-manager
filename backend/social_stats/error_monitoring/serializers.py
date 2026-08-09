# ============================================================================
#  Serializers for ErrorLog API + admin
# ============================================================================
from rest_framework import serializers

from .models import ErrorLog


class ErrorLogListSerializer(serializers.ModelSerializer):
    class Meta:
        model = ErrorLog
        fields = [
            'id', 'created_at', 'application_name', 'environment', 'severity',
            'exception_type', 'exception_message', 'request_method', 'request_path',
            'response_status_code', 'username', 'client_ip', 'workspace_id',
            'view_name', 'api_name', 'error_category', 'resolved', 'resolved_at',
            'screenshot_path',
        ]


class ErrorLogDetailSerializer(serializers.ModelSerializer):
    screenshot_url = serializers.SerializerMethodField()

    class Meta:
        model = ErrorLog
        fields = [f.name for f in ErrorLog._meta.fields] + ['screenshot_url']

    def get_screenshot_url(self, obj):
        if not obj.screenshot_path:
            return ''
        request = self.context.get('request')
        from django.conf import settings
        path = obj.screenshot_path.lstrip('/')
        media_url = settings.MEDIA_URL.rstrip('/') + '/' + path
        if request:
            return request.build_absolute_uri(media_url)
        base = getattr(settings, 'BACKEND_PUBLIC_URL', '').rstrip('/')
        if base:
            return f'{base}{media_url}'
        return media_url


class ErrorLogResolveSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, max_length=5000)
