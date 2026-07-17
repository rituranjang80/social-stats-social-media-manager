# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""DRF serializers for the Unified Composer module."""
import os

from rest_framework import serializers

from .models import (
    UnifiedPost, PlatformPublishLog, MediaAsset,
    PostQueue, QueuedItem, PostEngagement,
)


# ── Media ─────────────────────────────────────────────────────────────────────
class MediaAssetSerializer(serializers.ModelSerializer):
    file_url      = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    filename      = serializers.SerializerMethodField()
    uuid          = serializers.SerializerMethodField()

    class Meta:
        model = MediaAsset
        fields = [
            'id', 'uuid', 'client',
            'mime_type', 'file_size', 'width', 'height', 'duration_seconds',
            'alt_text', 'tags', 'folder', 'is_used',
            'file_url', 'thumbnail_url', 'filename',
            'created_at',
        ]
        read_only_fields = [
            'mime_type', 'file_size', 'width', 'height', 'duration_seconds',
            'is_used', 'created_at', 'filename', 'uuid',
        ]

    def get_file_url(self, obj):
        try:
            return obj.file.url if obj.file else ''
        except Exception:
            return ''

    def get_thumbnail_url(self, obj):
        try:
            return obj.thumbnail.url if obj.thumbnail else ''
        except Exception:
            return ''

    def get_filename(self, obj):
        try:
            return os.path.basename(obj.file.name) if obj.file else ''
        except Exception:
            return ''

    def get_uuid(self, obj):
        # Stable string id for clients that expect a uuid-like key (PK-backed).
        return str(obj.id)


# ── Publish log + engagement ──────────────────────────────────────────────────
class PostEngagementSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostEngagement
        fields = [
            'likes', 'comments', 'shares', 'saves',
            'reach', 'impressions', 'video_views',
            'watch_time_seconds', 'click_throughs', 'pulled_at',
        ]


class PlatformPublishLogSerializer(serializers.ModelSerializer):
    engagement = PostEngagementSerializer(read_only=True)

    class Meta:
        model = PlatformPublishLog
        fields = [
            'id', 'unified_post', 'platform', 'status',
            'platform_post_id', 'platform_url',
            'error_code', 'error_message',
            'attempted_at', 'completed_at', 'engagement_synced_at',
            'engagement',
        ]
        read_only_fields = fields


# ── Unified post ──────────────────────────────────────────────────────────────
class UnifiedPostSerializer(serializers.ModelSerializer):
    publish_logs = PlatformPublishLogSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    media_assets = MediaAssetSerializer(many=True, read_only=True)
    media_asset_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True,
    )

    class Meta:
        model = UnifiedPost
        fields = [
            'id', 'client',
            'title', 'content', 'first_comment', 'tags', 'internal_notes',
            'media_urls', 'media_assets', 'media_asset_ids', 'media_type',
            'target_platforms', 'platform_overrides',
            'scheduled_at', 'published_at',
            'status', 'is_recurring', 'recurrence_rule',
            'ai_generated', 'ai_prompt',
            'created_by', 'created_by_name',
            'created_at', 'updated_at',
            'approved_by', 'approved_at',
            'publish_logs',
        ]
        read_only_fields = [
            'status', 'published_at',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
            'approved_by', 'approved_at', 'media_assets',
        ]

    def validate_target_platforms(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError('target_platforms must be a list')
        return [str(p).lower() for p in value if p]

    def validate_tags(self, value):
        if value in (None, ''):
            return []
        if isinstance(value, str):
            parts = [t.strip() for t in value.split(',') if t.strip()]
        elif isinstance(value, list):
            parts = [str(t).strip() for t in value if str(t).strip()]
        else:
            raise serializers.ValidationError('tags must be a list of strings')
        # Cap length / count for safe internal use
        cleaned = []
        for t in parts[:25]:
            cleaned.append(t[:48])
        return cleaned

    def validate(self, attrs):
        media_type = attrs.get('media_type', getattr(self.instance, 'media_type', 'text'))
        media_urls = attrs.get('media_urls')
        if media_urls is None and self.instance is not None:
            media_urls = self.instance.media_urls or []
        media_urls = media_urls or []
        if media_type != 'text' and not media_urls:
            raise serializers.ValidationError(
                {'media_urls': 'At least one media URL is required for non-text posts'}
            )
        return attrs

    @staticmethod
    def _asset_ids_from_urls(media_urls):
        ids = []
        for u in media_urls or []:
            if isinstance(u, str) and u.startswith('asset:'):
                try:
                    ids.append(int(u.split(':', 1)[1]))
                except (ValueError, IndexError):
                    pass
        return ids

    def _sync_media_assets(self, post, media_asset_ids, media_urls):
        ids = list(media_asset_ids) if media_asset_ids is not None else self._asset_ids_from_urls(media_urls)
        # Deduplicate while preserving order
        seen, ordered = set(), []
        for i in ids:
            if i in seen:
                continue
            seen.add(i)
            ordered.append(i)
        assets = list(MediaAsset.objects.filter(client_id=post.client_id, id__in=ordered))
        by_id = {a.id: a for a in assets}
        ordered_assets = [by_id[i] for i in ordered if i in by_id]
        post.media_assets.set(ordered_assets)
        for a in ordered_assets:
            if not a.is_used:
                a.is_used = True
                a.save(update_fields=['is_used'])

    def create(self, validated_data):
        media_asset_ids = validated_data.pop('media_asset_ids', None)
        # Accept legacy body key `media_assets` as a list of PKs when nested write isn't used
        raw = self.initial_data.get('media_assets')
        if media_asset_ids is None and isinstance(raw, list) and raw and not isinstance(raw[0], dict):
            media_asset_ids = [int(x) for x in raw if str(x).isdigit() or isinstance(x, int)]
        post = super().create(validated_data)
        self._sync_media_assets(post, media_asset_ids, validated_data.get('media_urls'))
        return post

    def update(self, instance, validated_data):
        media_asset_ids = validated_data.pop('media_asset_ids', None)
        raw = self.initial_data.get('media_assets')
        if media_asset_ids is None and isinstance(raw, list) and (not raw or not isinstance(raw[0], dict)):
            try:
                media_asset_ids = [int(x) for x in raw]
            except (TypeError, ValueError):
                media_asset_ids = None
        post = super().update(instance, validated_data)
        # Always re-sync when media_urls or explicit ids provided
        if media_asset_ids is not None or 'media_urls' in validated_data:
            self._sync_media_assets(
                post,
                media_asset_ids,
                validated_data.get('media_urls', post.media_urls),
            )
        return post


class UnifiedPostListSerializer(serializers.ModelSerializer):
    """Compact serializer for list views — omits publish_logs to keep payload small."""
    platform_count = serializers.SerializerMethodField()

    class Meta:
        model = UnifiedPost
        fields = [
            'id', 'client', 'title',
            'content', 'tags', 'media_type', 'media_urls', 'target_platforms', 'platform_count',
            'status', 'scheduled_at', 'published_at',
            'created_by', 'created_at',
        ]
        read_only_fields = fields

    def get_platform_count(self, obj):
        return len(obj.target_platforms or [])


# ── Queues ────────────────────────────────────────────────────────────────────
class QueuedItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = QueuedItem
        fields = [
            'id', 'queue',
            'content', 'media_urls', 'hashtags', 'sort_order', 'status',
            'used_at', 'unified_post', 'created_at',
        ]
        read_only_fields = ['status', 'used_at', 'unified_post', 'created_at']


class PostQueueSerializer(serializers.ModelSerializer):
    items_count   = serializers.SerializerMethodField()
    waiting_count = serializers.SerializerMethodField()

    class Meta:
        model = PostQueue
        fields = [
            'id', 'client', 'name', 'platforms', 'schedule_rule',
            'queue_strategy', 'is_active',
            'last_dispatched_at',
            'items_count', 'waiting_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['last_dispatched_at', 'created_at', 'updated_at']

    def get_items_count(self, obj):
        return obj.items.count()

    def get_waiting_count(self, obj):
        return obj.items.filter(status='waiting').count()
