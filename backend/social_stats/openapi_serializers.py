"""Request/response serializers used only for OpenAPI / Swagger examples.

These serializers drive Swagger UI dropdowns (ChoiceField → enum) and
pre-filled sample bodies so Try it out → Execute works without hand-editing JSON.
"""
from rest_framework import serializers

from .models import PLATFORM_CHOICES, ROLE_CHOICES

PLATFORM_ENUM = [c[0] for c in PLATFORM_CHOICES]
CONNECT_PLATFORM_ENUM = PLATFORM_ENUM + [
    'instagram_login',
    'linkedin_personal',
    'linkedin_company',
    'tiktok',
    'pinterest',
    'threads',
    'bluesky',
    'mastodon',
    'twitter',
    'google_business',
]
DAYS_ENUM = [7, 14, 30, 60, 90]
GOOGLE_PLATFORM_ENUM = ['youtube', 'google_my_business', 'all']


class LoginRequestSerializer(serializers.Serializer):
    username = serializers.CharField(
        help_text='Email / username (demo: admin@demo.local)',
    )
    password = serializers.CharField(
        help_text='Password (demo: demo)',
        style={'input_type': 'password'},
    )
    terms_accepted = serializers.BooleanField(
        help_text='Must be true to sign in',
        default=True,
    )



class LoginSuccessSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()


class TokenRefreshRequestSerializer(serializers.Serializer):
    refresh = serializers.CharField(help_text='Refresh token from login')


class SignupRequestSerializer(serializers.Serializer):
    full_name = serializers.CharField()
    email = serializers.EmailField()
    password = serializers.CharField(style={'input_type': 'password'})
    terms_accepted = serializers.BooleanField(default=True)


class PlatformQuerySerializer(serializers.Serializer):
    """Reusable query param helpers (not posted as a body)."""
    platform = serializers.ChoiceField(
        choices=[('all', 'All')] + list(PLATFORM_CHOICES),
        required=False,
        default='all',
    )
    days = serializers.ChoiceField(
        choices=[(d, f'{d} days') for d in DAYS_ENUM],
        required=False,
        default=30,
    )


class OauthDisconnectPathSerializer(serializers.Serializer):
    platform = serializers.ChoiceField(choices=[(p, p) for p in CONNECT_PLATFORM_ENUM])


class GoogleOauthStartQuerySerializer(serializers.Serializer):
    platform = serializers.ChoiceField(
        choices=[(p, p) for p in GOOGLE_PLATFORM_ENUM],
        required=False,
        default='all',
        help_text='Which Google product to request scopes for',
    )


class ComposePostRequestSerializer(serializers.Serializer):
    topic = serializers.CharField(
        help_text='What the post is about',
        default='Announce our weekend sale with a warm, upbeat tone',
    )
    platforms = serializers.ListField(
        child=serializers.ChoiceField(choices=[(p, p) for p in PLATFORM_ENUM]),
        help_text='Target platforms — pick from the enum list',
        required=False,
    )
    tone = serializers.ChoiceField(
        choices=[
            ('friendly', 'Friendly'),
            ('professional', 'Professional'),
            ('witty', 'Witty'),
            ('bold', 'Bold'),
        ],
        required=False,
        default='friendly',
    )
    length = serializers.ChoiceField(
        choices=[('short', 'Short'), ('medium', 'Medium'), ('long', 'Long')],
        required=False,
        default='medium',
    )


class SuggestTimesRequestSerializer(serializers.Serializer):
    client_id = serializers.IntegerField()
    platform = serializers.ChoiceField(
        choices=PLATFORM_CHOICES,
        default='facebook',
    )
    days_ahead = serializers.ChoiceField(
        choices=[(7, '7'), (14, '14'), (30, '30')],
        default=7,
        required=False,
    )


class RolePathSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=ROLE_CHOICES)
