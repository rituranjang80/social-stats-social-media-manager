from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import ErrorLogViewSet
from .client_report_views import ClientErrorReportView

router = DefaultRouter()
router.register(r'errors', ErrorLogViewSet, basename='error-log')

urlpatterns = [
    path('errors/client-report/', ClientErrorReportView.as_view(), name='error-log-client-report'),
    path('', include(router.urls)),
]
