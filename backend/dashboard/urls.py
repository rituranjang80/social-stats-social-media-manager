# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve as media_serve

from social_stats.oauth_views import (
    facebook_oauth_callback,
    google_oauth_callback,
    linkedin_oauth_callback,
)
from social_stats.social_auth_views import google_social_callback

urlpatterns = [
    # Django admin site — NOT the React SPA shell at /admin/*
    path('django-admin/', admin.site.urls),
    path('api/', include('social_stats.urls')),

    # Alias callbacks matching already-registered OAuth console URLs (port 8000).
    # These call the same handlers as /api/oauth/... and /api/auth/social/...
    path(
        'accounts/google/login/callback/',
        google_social_callback,
        name='compat_google_login_callback',
    ),
    path(
        'social-accounts/callback/facebook/',
        facebook_oauth_callback,
        name='compat_facebook_callback',
    ),
    path(
        'social-accounts/callback/google_business/',
        google_oauth_callback,
        name='compat_google_business_callback',
    ),
    path(
        'social-accounts/callback/linkedin_personal/',
        linkedin_oauth_callback,
        name='compat_linkedin_personal_callback',
    ),
]

# django.conf.urls.static.static() is a no-op when DEBUG=False. Keep an explicit
# serve route so composer thumbnails still resolve outside Docker. In Compose,
# nginx serves /media/ from the shared data/media volume (preferred).
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    urlpatterns += [
        re_path(
            r'^media/(?P<path>.*)$',
            media_serve,
            {'document_root': settings.MEDIA_ROOT},
        ),
    ]
