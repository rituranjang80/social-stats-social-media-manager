# ============================================================================
#  REST API permissions for error log management
# ============================================================================
from rest_framework.permissions import BasePermission


class IsStaffOrSuperadmin(BasePermission):
    """Allow staff/superadmin roles (Social Stats UserProfile)."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        profile = getattr(user, 'profile', None)
        if profile is None:
            try:
                from social_stats.models import UserProfile
                profile = UserProfile.objects.filter(user_id=user.id).first()
            except Exception:
                return False
        if not profile:
            return False
        return profile.role in ('superadmin', 'staff')
