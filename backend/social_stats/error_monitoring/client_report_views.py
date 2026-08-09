# ============================================================================
#  POST /api/errors/client-report/ — browser / React error ingestion
# ============================================================================
from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from .frontend_report import report_frontend_error


class ClientErrorReportThrottle(AnonRateThrottle):
    rate = '30/minute'


class ClientErrorReportView(APIView):
    """
    Accept client-side errors (ErrorBoundary, window.onerror, unhandledrejection).
    Auth optional — user is attached when a JWT is sent.
    """
    permission_classes = [AllowAny]
    throttle_classes = [ClientErrorReportThrottle, UserRateThrottle]

    def post(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        message = (data.get('message') or data.get('exception_message') or '').strip()
        stack = (data.get('stack') or '').strip()
        if not message and not stack:
            return Response({'error': 'message or stack is required'}, status=status.HTTP_400_BAD_REQUEST)

        log_id = report_frontend_error(data, request=request)
        if log_id is None:
            return Response({'accepted': False, 'reason': 'disabled'}, status=status.HTTP_204_NO_CONTENT)
        return Response({'accepted': True, 'error_id': str(log_id)}, status=status.HTTP_201_CREATED)
