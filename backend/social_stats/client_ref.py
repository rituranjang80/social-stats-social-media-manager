# ============================================================================
# Resolve workspace (Client) by public UUID or legacy numeric id.
# ============================================================================
from __future__ import annotations

import uuid
from typing import Optional, Union

from .models import Client

ClientRef = Union[str, int, uuid.UUID, None]


def resolve_client_pk(client_ref: ClientRef) -> Optional[int]:
    """Return internal Client.pk for a public_id UUID string or legacy int id."""
    client = get_client_by_ref(client_ref)
    return client.pk if client else None


def get_client_by_ref(client_ref: ClientRef) -> Optional[Client]:
    if client_ref is None or client_ref == '':
        return None
    if isinstance(client_ref, Client):
        return client_ref

    text = str(client_ref).strip()
    if not text:
        return None

    try:
        uid = uuid.UUID(text)
        return Client.objects.filter(public_id=uid).first()
    except (ValueError, AttributeError):
        pass

    try:
        pk = int(text)
    except (TypeError, ValueError):
        return None
    return Client.objects.filter(pk=pk).first()


def client_public_ref(client: Client | None) -> Optional[str]:
    if not client:
        return None
    pid = getattr(client, 'public_id', None)
    if pid:
        return str(pid)
    return str(client.pk)


def resolve_client_pk_or_none(client_ref: ClientRef) -> Optional[int]:
    """Resolve ref; return None if invalid (no DB hit on malformed uuid)."""
    return resolve_client_pk(client_ref)


def client_ref_from_request(request) -> Optional[str]:
    """Read workspace ref from body, query, or gateway headers."""
    raw = None
    if hasattr(request, 'data'):
        try:
            raw = request.data.get('client_id') or request.data.get('client')
        except Exception:
            pass
    if not raw and hasattr(request, 'query_params'):
        raw = (
            request.query_params.get('client_id')
            or request.query_params.get('workspace_id')
        )
    if not raw and hasattr(request, 'META'):
        raw = (
            request.META.get('HTTP_X_CLIENT_ID')
            or request.META.get('HTTP_X_WORKSPACE_ID')
        )
    if raw in (None, ''):
        return None
    return str(raw).strip()


def resolve_request_client(request):
    """
    Tenant guard for function-based API views.
    Returns (Client, None) on success, (None, Response) on error.
    """
    from rest_framework.response import Response

    try:
        profile = request.user.profile
    except Exception:
        return None, Response({'error': 'No profile'}, status=403)

    raw = client_ref_from_request(request)

    if profile.role == 'superadmin':
        ref = raw
        if ref is None and profile.client_id:
            ref = profile.client_id
        if not ref:
            return None, Response({'error': 'client_id required'}, status=400)
        pk = resolve_client_pk(ref)
        if pk is None:
            return None, Response({'error': 'client_id required'}, status=400)
        try:
            return Client.objects.get(pk=pk), None
        except Client.DoesNotExist:
            return None, Response({'error': 'Client not found'}, status=404)

    if profile.role == 'staff':
        if not raw:
            return None, Response({'error': 'client_id required'}, status=400)
        pk = resolve_client_pk(raw)
        if pk is None or not profile.assigned_clients.filter(id=pk).exists():
            return None, Response({'error': 'client_id required'}, status=400)
        try:
            return Client.objects.get(pk=pk), None
        except Client.DoesNotExist:
            return None, Response({'error': 'Client not found'}, status=404)

    if not profile.client_id:
        return None, Response({'error': 'client_id required'}, status=400)
    if raw:
        pk = resolve_client_pk(raw)
        if pk is not None and pk != profile.client_id:
            return None, Response({'error': 'Forbidden'}, status=403)
    try:
        return Client.objects.get(pk=profile.client_id), None
    except Client.DoesNotExist:
        return None, Response({'error': 'Client not found'}, status=404)
