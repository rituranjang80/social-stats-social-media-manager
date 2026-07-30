# ============================================================================
#  Error monitoring — configuration constants
# ============================================================================
from __future__ import annotations

SEVERITY_INFO = 'INFO'
SEVERITY_WARNING = 'WARNING'
SEVERITY_ERROR = 'ERROR'
SEVERITY_CRITICAL = 'CRITICAL'

SEVERITY_CHOICES = [
    (SEVERITY_INFO, 'Info'),
    (SEVERITY_WARNING, 'Warning'),
    (SEVERITY_ERROR, 'Error'),
    (SEVERITY_CRITICAL, 'Critical'),
]

ENV_DEVELOPMENT = 'Development'
ENV_STAGING = 'Staging'
ENV_PRODUCTION = 'Production'

ENVIRONMENT_CHOICES = [
    (ENV_DEVELOPMENT, 'Development'),
    (ENV_STAGING, 'Staging'),
    (ENV_PRODUCTION, 'Production'),
]

DEFAULT_DEDUP_SECONDS = 30
DEFAULT_APPLICATION_NAME = 'social-stats'
