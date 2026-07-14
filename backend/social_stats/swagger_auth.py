"""Swagger Authorize — OAuth2 password token endpoint.

Swagger UI's Authorize dialog posts form-urlencoded
``grant_type=password&username=&password=`` to ``tokenUrl``. We accept that
(and JSON) and return a standard OAuth2 access_token response so the UI can
log in with username + password without copy-pasting JWTs.
"""
from __future__ import annotations

from django.contrib.auth.models import User
from django.conf import settings as dj_settings
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes, parser_classes, throttle_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiResponse

from .security.throttles import LoginIPThrottle
from .views import CustomTokenSerializer


class SwaggerTokenFormSerializer(serializers.Serializer):
    grant_type = serializers.ChoiceField(
        choices=[('password', 'password')],
        default='password',
        required=False,
        help_text='Must be password',
    )
    username = serializers.CharField(help_text='Demo: admin@demo.local')
    password = serializers.CharField(
        help_text='Demo: demo',
        style={'input_type': 'password'},
    )
    client_id = serializers.CharField(required=False, allow_blank=True, default='')
    client_secret = serializers.CharField(required=False, allow_blank=True, default='')
    terms_accepted = serializers.BooleanField(
        required=False,
        default=True,
        help_text='Accepted automatically for Swagger Authorize',
    )


class SwaggerTokenResponseSerializer(serializers.Serializer):
    access_token = serializers.CharField()
    token_type = serializers.CharField()
    expires_in = serializers.IntegerField()
    refresh_token = serializers.CharField(required=False)


@extend_schema(
    tags=['Auth'],
    summary='Login (username + password) — Swagger Authorize',
    description=(
        'Use **Authorize → passwordAuth** and enter username / password. '
        'Demo: `admin@demo.local` / `demo`. '
        'Returns OAuth2-style `access_token` for Swagger UI.'
    ),
    request={
        'application/x-www-form-urlencoded': SwaggerTokenFormSerializer,
        'application/json': SwaggerTokenFormSerializer,
    },
    responses={
        200: OpenApiResponse(
            response=SwaggerTokenResponseSerializer,
            description='Bearer access token',
        ),
    },
    examples=[
        OpenApiExample(
            'Demo superadmin',
            value={
                'grant_type': 'password',
                'username': 'admin@demo.local',
                'password': 'demo',
                'terms_accepted': True,
            },
            request_only=True,
        ),
    ],
    auth=[],
)
@api_view(['POST'])
@permission_classes([AllowAny])
@parser_classes([JSONParser, FormParser, MultiPartParser])
@throttle_classes([LoginIPThrottle])
def swagger_password_token(request):
    # Swagger UI / form posts may put credentials in QueryDict or nested keys
    data = request.data
    username = (
        data.get('username')
        or data.get('email')
        or request.POST.get('username')
        or ''
    )
    username = str(username).strip().lower()
    password = data.get('password') or request.POST.get('password') or ''
    password = str(password)
    grant_type = (data.get('grant_type') or request.POST.get('grant_type') or 'password')
    grant_type = str(grant_type).strip().lower()
    terms = data.get('terms_accepted', True)
    if isinstance(terms, str):
        terms = terms.strip().lower() in ('1', 'true', 'yes', 'on')

    if grant_type and grant_type != 'password':
        return Response(
            {'error': 'unsupported_grant_type', 'detail': 'Only grant_type=password is supported.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not terms:
        return Response(
            {'error': 'invalid_request', 'detail': 'terms_accepted must be true.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not username or not password:
        return Response(
            {'error': 'invalid_request', 'detail': 'username and password are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        candidate = User.objects.get(username=username)
        if not candidate.is_active and hasattr(candidate, 'email_verification'):
            return Response(
                {'error': 'invalid_grant', 'detail': 'email_not_verified'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if bool(getattr(candidate, 'mfa', None) and candidate.mfa.is_enabled):
            return Response(
                {
                    'error': 'mfa_required',
                    'detail': 'MFA enabled — use POST /api/auth/login/ then /api/auth/mfa/login/.',
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )
    except User.DoesNotExist:
        pass

    # context.request required — django-axes authenticate() needs the request
    ser = CustomTokenSerializer(
        data={'username': username, 'password': password},
        context={'request': request},
    )
    if not ser.is_valid():
        return Response(
            {'error': 'invalid_grant', 'detail': 'Invalid username or password.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    from datetime import timedelta

    access = ser.validated_data['access']
    refresh = ser.validated_data.get('refresh')
    lifetime = (getattr(dj_settings, 'SIMPLE_JWT', {}) or {}).get('ACCESS_TOKEN_LIFETIME')
    if not isinstance(lifetime, timedelta):
        lifetime = timedelta(minutes=15)
    expires = int(lifetime.total_seconds())

    return Response({
        'access_token': str(access),
        'token_type': 'bearer',
        'expires_in': expires,
        'refresh_token': str(refresh) if refresh else '',
    })
