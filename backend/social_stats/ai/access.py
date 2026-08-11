# ============================================================================
#  RBAC helper for AI composer endpoints.
# ============================================================================
from __future__ import annotations

from rest_framework.response import Response

from ..permissions import PermissionChecker


def require_ai_compose(request):
    """Return a 403 Response if the user lacks ai.compose; else None."""
    profile = getattr(request.user, 'profile', None)
    if not PermissionChecker.has_permission(profile, 'ai.compose'):
        return Response({
            'error': 'You do not have permission to use AI compose. '
                     'Ask an admin to enable “Use AI Compose” in Management → Permissions.',
            'code': 'ai.compose_denied',
        }, status=403)
    return None
