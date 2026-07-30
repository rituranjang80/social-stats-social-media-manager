from django.apps import AppConfig


class SocialStatsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'social_stats'

    def ready(self) -> None:
        from social_stats.error_monitoring.hooks import install_hooks
        install_hooks()
        from social_stats.error_monitoring import admin as _error_monitoring_admin  # noqa: F401
