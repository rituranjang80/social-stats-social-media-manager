"""drf-spectacular OpenAPI helpers — tags, examples, auth extensions, hooks.

Keep this module free of Django model imports so ``dashboard.settings`` can
call ``spectacular_settings()`` during settings load.
"""
from __future__ import annotations

from drf_spectacular.extensions import OpenApiAuthenticationExtension
from drf_spectacular.utils import OpenApiExample, OpenApiParameter, OpenApiTypes

PLATFORM_ENUM = [
    'facebook',
    'instagram',
    'youtube',
    'linkedin',
    'google_my_business',
]
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

TAG_DEFS = [
    {'name': 'Auth', 'description': 'Login, signup, JWT refresh, MFA, sessions'},
    {'name': 'Clients', 'description': 'Workspaces (clients), credentials, sync'},
    {'name': 'OAuth', 'description': 'Connect social platforms (Meta / Google / LinkedIn)'},
    {'name': 'Composer', 'description': 'Unified posts, media, queues, preflight'},
    {'name': 'Calendar', 'description': 'Content calendar, notes, schedules'},
    {'name': 'Inbox', 'description': 'Unified inbox conversations & reviews'},
    {'name': 'AI', 'description': 'Captions, compose, rewrite, assistant'},
    {'name': 'WhatsApp', 'description': 'WhatsApp accounts, contacts, bot flows'},
    {'name': 'Management', 'description': 'Staff, RBAC, portal config (admin)'},
    {'name': 'Relations', 'description': 'Agency ↔ client relations & approvals'},
    {'name': 'Marketplace', 'description': 'Agency marketplace & reviews'},
    {'name': 'Privacy', 'description': 'Exports, delete account, consents'},
    {'name': 'ROI', 'description': 'ROI calculator & reports'},
    {'name': 'Public', 'description': 'AllowAny endpoints (lookups, health, reports)'},
    {'name': 'Other', 'description': 'Remaining API routes'},
]

_PREFIX_TAGS = (
    ('auth/', 'Auth'),
    ('end-user/', 'Auth'),
    ('clients', 'Clients'),
    ('credentials', 'Clients'),
    ('oauth/', 'OAuth'),
    ('manual/', 'OAuth'),
    ('composer/', 'Composer'),
    ('calendar/', 'Calendar'),
    ('inbox/', 'Inbox'),
    ('ai/', 'AI'),
    ('whatsapp/', 'WhatsApp'),
    ('bot-', 'WhatsApp'),
    ('ctwa-', 'WhatsApp'),
    ('leads/', 'WhatsApp'),
    ('management/', 'Management'),
    ('relations/', 'Relations'),
    ('approvals/', 'Relations'),
    ('activity/', 'Relations'),
    ('marketplace/', 'Marketplace'),
    ('agency/', 'Marketplace'),
    ('reviews/', 'Marketplace'),
    ('privacy/', 'Privacy'),
    ('api-keys/', 'Privacy'),
    ('roi/', 'ROI'),
    ('public/', 'Public'),
    ('health/', 'Public'),
)


def preprocessing_filter_spec(endpoints):
    return endpoints


def tag_by_url_prefix(result, generator, request, public):
    paths = result.get('paths') or {}
    for path, methods in paths.items():
        clean = path.lstrip('/')
        if clean.startswith('api/'):
            clean = clean[4:]
        tag = 'Other'
        for prefix, name in _PREFIX_TAGS:
            if clean.startswith(prefix):
                tag = name
                break
        for method, operation in list(methods.items()):
            if method.startswith('x-') or not isinstance(operation, dict):
                continue
            if not operation.get('tags'):
                operation['tags'] = [tag]
    return result


def inject_try_it_out_examples(result, generator, request, public):
    examples = {
        '/api/auth/login/': {
            'post': {
                'summary': 'Demo admin login',
                'value': {
                    'username': 'admin@demo.local',
                    'password': 'demo',
                    'terms_accepted': True,
                },
            },
        },
        '/api/auth/token/': {
            'post': {
                'summary': 'Swagger Authorize login',
                'value': {
                    'grant_type': 'password',
                    'username': 'admin@demo.local',
                    'password': 'demo',
                    'terms_accepted': True,
                },
            },
        },
        '/api/auth/refresh/': {
            'post': {
                'summary': 'Refresh access token',
                'value': {'refresh': '<paste_refresh_token_here>'},
            },
        },
        '/api/auth/signup/': {
            'post': {
                'summary': 'New client signup',
                'value': {
                    'full_name': 'Jane Demo',
                    'email': 'jane.demo@example.com',
                    'password': 'ChangeMe123!',
                    'terms_accepted': True,
                },
            },
        },
        '/api/ai/compose-post/': {
            'post': {
                'summary': 'Compose caption sample',
                'value': {
                    'topic': 'Weekend sale announcement',
                    'platforms': ['facebook', 'instagram'],
                    'tone': 'friendly',
                    'length': 'medium',
                },
            },
        },
    }

    paths = result.get('paths') or {}
    for path, method_map in examples.items():
        ops = paths.get(path) or paths.get(path.rstrip('/')) or paths.get(path + '/')
        if not ops:
            continue
        for method, ex in method_map.items():
            op = ops.get(method)
            if not op:
                continue
            rb = op.setdefault('requestBody', {
                'required': True,
                'content': {'application/json': {
                    'schema': {'type': 'object', 'additionalProperties': True},
                }},
            })
            content = rb.setdefault('content', {})
            app = content.setdefault('application/json', {})
            # Never wipe a $ref / properties schema — only attach examples.
            if 'schema' not in app:
                app['schema'] = {'type': 'object', 'additionalProperties': True}
            app.setdefault('examples', {})
            app['examples']['default'] = {
                'summary': ex.get('summary', 'Sample'),
                'value': ex['value'],
            }
            app['example'] = ex['value']
    return result


def ensure_editable_inputs(result, generator, request, public):
    """Ensure Swagger Try it out shows real input controls.

    Undocumented ``@api_view`` write endpoints often omit ``requestBody``, so
    Swagger shows parameter labels with no editor. Empty object schemas get
    ``additionalProperties`` so the JSON body editor appears. Path/query
    params without a schema type get a typed schema. Password fields get
    ``format: password``.
    """
    # Password format on known login schemas
    schemas = (result.get('components') or {}).get('schemas') or {}
    for name, schema in schemas.items():
        if not isinstance(schema, dict):
            continue
        props = schema.get('properties') or {}
        for key, prop in props.items():
            if key in ('password', 'new_password', 'old_password', 'client_secret') and isinstance(prop, dict):
                if '$ref' not in prop:
                    prop['format'] = 'password'
                    prop['type'] = prop.get('type') or 'string'

    for path, methods in (result.get('paths') or {}).items():
        for method, operation in list(methods.items()):
            if method.startswith('x-') or not isinstance(operation, dict):
                continue

            for param in operation.get('parameters') or []:
                if not isinstance(param, dict) or '$ref' in param:
                    continue
                schema = param.setdefault('schema', {})
                if not schema.get('type') and '$ref' not in schema and 'allOf' not in schema:
                    pname = (param.get('name') or '').lower()
                    if pname.endswith('_id') or pname in ('id', 'pk', 'client_id', 'days', 'page'):
                        schema['type'] = 'integer'
                    else:
                        schema['type'] = 'string'

            if method not in ('post', 'put', 'patch'):
                continue

            rb = operation.get('requestBody')
            if not rb:
                # Do NOT inject empty ``{}`` — that clutters Swagger. Endpoints
                # that need a body must declare serializers via @extend_schema.
                continue

            # Drop catch-all empty object bodies (legacy hook residue)
            content = rb.get('content') or {}
            app = content.get('application/json')
            if isinstance(app, dict):
                schema = app.get('schema') or {}
                if (
                    isinstance(schema, dict)
                    and '$ref' not in schema
                    and 'allOf' not in schema
                    and not schema.get('properties')
                    and schema.get('additionalProperties') is True
                    and not app.get('examples')
                    and (app.get('example') in (None, {}))
                ):
                    operation.pop('requestBody', None)
                    continue

            for media in content.values():
                if not isinstance(media, dict):
                    continue
                schema = media.get('schema')
                if not isinstance(schema, dict):
                    continue
                if '$ref' in schema or 'allOf' in schema or schema.get('properties'):
                    continue
                if schema.get('additionalProperties') is True and not schema.get('properties'):
                    # Keep only if an example documents real fields
                    if media.get('examples') or (media.get('example') not in (None, {})):
                        continue
                    operation.pop('requestBody', None)
                    break
    return result


class APIKeyAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = 'social_stats.security.api_keys.APIKeyAuthentication'
    name = 'ApiKeyBearer'
    match_subclasses = True
    priority = -1

    def get_security_definition(self, auto_schema):
        return {
            'type': 'http',
            'scheme': 'bearer',
            'bearerFormat': 'sk_live_… or sk_test_…',
            'description': (
                'Optional API key. Paste the full key; Swagger sends '
                '`Authorization: Bearer <key>`.'
            ),
        }


PARAM_PLATFORM = OpenApiParameter(
    name='platform',
    type=OpenApiTypes.STR,
    location=OpenApiParameter.QUERY,
    description='Social platform filter',
    enum=['all', *PLATFORM_ENUM],
    default='all',
)

PARAM_DAYS = OpenApiParameter(
    name='days',
    type=OpenApiTypes.INT,
    location=OpenApiParameter.QUERY,
    description='Lookback window in days',
    enum=DAYS_ENUM,
    default=30,
)

PARAM_GOOGLE_PLATFORM = OpenApiParameter(
    name='platform',
    type=OpenApiTypes.STR,
    location=OpenApiParameter.QUERY,
    description='Google OAuth product scopes',
    enum=GOOGLE_PLATFORM_ENUM,
    default='all',
)

PARAM_OAUTH_PLATFORM_PATH = OpenApiParameter(
    name='platform',
    type=OpenApiTypes.STR,
    location=OpenApiParameter.PATH,
    description='Platform credential key to disconnect',
    enum=CONNECT_PLATFORM_ENUM,
)

LOGIN_EXAMPLES = [
    OpenApiExample(
        'Demo superadmin',
        value={
            'username': 'admin@demo.local',
            'password': 'demo',
            'terms_accepted': True,
        },
        request_only=True,
    ),
    OpenApiExample(
        'Demo client',
        value={
            'username': 'demo@demo.local',
            'password': 'demo',
            'terms_accepted': True,
        },
        request_only=True,
    ),
]


# Tag cards for Swagger sidebar (also referenced by tag_by_url_prefix).
# SPECTACULAR_SETTINGS itself lives in dashboard.settings (must not import this
# module during settings load — spectacular caches settings on first import).
