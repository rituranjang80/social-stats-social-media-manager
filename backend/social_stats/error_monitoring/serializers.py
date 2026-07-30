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
        ]


class ErrorLogDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = ErrorLog
        fields = '__all__'


class ErrorLogResolveSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, max_length=5000)
