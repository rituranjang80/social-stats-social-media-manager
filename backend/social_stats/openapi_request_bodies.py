"""Named request-body serializers for Swagger Try it out.

Keep these truthful to what each view reads from ``request.data``.
Use ``request=None`` on ``@extend_schema`` when the endpoint ignores the body.
"""
from rest_framework import serializers

from .models import PLATFORM_CHOICES


class FlagActivityRequestSerializer(serializers.Serializer):
    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text='Why this activity is flagged (stored in metadata.flag_reason)',
        default='Looks suspicious',
    )


class CreateClientUserRequestSerializer(serializers.Serializer):
    company = serializers.CharField(help_text='Company / workspace name')
    name = serializers.CharField(help_text='Contact person full name')
    email = serializers.EmailField(help_text='Login email (also username)')
    password = serializers.CharField(
        help_text='Initial password',
        style={'input_type': 'password'},
    )


class ResolveDisputeRequestSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[
            ('resolved', 'resolved'),
            ('rejected', 'rejected'),
            ('escalated', 'escalated'),
            ('under_review', 'under_review'),
        ],
        help_text='New dispute status',
    )
    action = serializers.ChoiceField(
        choices=[
            ('paused', 'paused'),
            ('terminated', 'terminated'),
            ('warned', 'warned'),
            ('dismissed', 'dismissed'),
            ('escalated', 'escalated'),
            ('', '(none)'),
        ],
        required=False,
        allow_blank=True,
        default='dismissed',
        help_text='Side-effect on the agency↔client relation',
    )
    resolution = serializers.CharField(
        required=False,
        allow_blank=True,
        default='Reviewed by platform admin',
        help_text='Decision notes shown to both parties',
    )


class VerificationDecisionRequestSerializer(serializers.Serializer):
    note = serializers.CharField(
        required=False,
        allow_blank=True,
        default='',
        help_text='Optional note for the agency owner',
    )


class SuggestHashtagsRequestSerializer(serializers.Serializer):
    content = serializers.CharField(help_text='Draft caption / text')
    platform = serializers.ChoiceField(
        choices=PLATFORM_CHOICES,
        default='instagram',
        required=False,
    )
    count = serializers.IntegerField(required=False, default=12, min_value=1, max_value=30)
    client_id = serializers.IntegerField(required=False, help_text='Staff/superadmin only')


class BestTimeRequestSerializer(serializers.Serializer):
    platform = serializers.ChoiceField(choices=PLATFORM_CHOICES)
    content_type = serializers.CharField(required=False, allow_blank=True, default='')
    client_id = serializers.IntegerField(required=False)


class SuggestReplyRequestSerializer(serializers.Serializer):
    message_id = serializers.IntegerField(help_text='Inbox message id')


class RewriteRequestSerializer(serializers.Serializer):
    text = serializers.CharField()
    instruction = serializers.ChoiceField(
        choices=[
            ('shorter', 'shorter'),
            ('longer', 'longer'),
            ('more professional', 'more professional'),
            ('more casual', 'more casual'),
            ('add CTA', 'add CTA'),
        ],
        required=False,
        default='shorter',
    )
    client_id = serializers.IntegerField(required=False)


class TranslateRequestSerializer(serializers.Serializer):
    text = serializers.CharField()
    target_language = serializers.CharField(default='Spanish', help_text='e.g. Spanish, Hindi, French')
    client_id = serializers.IntegerField(required=False)


class ImageCaptionRequestSerializer(serializers.Serializer):
    image_url = serializers.URLField()
    platform = serializers.ChoiceField(choices=PLATFORM_CHOICES, default='instagram', required=False)
    length = serializers.ChoiceField(
        choices=[('short', 'short'), ('medium', 'medium'), ('long', 'long')],
        default='medium',
        required=False,
    )
    client_id = serializers.IntegerField(required=False)


class ContentCalendarRequestSerializer(serializers.Serializer):
    industry = serializers.CharField(required=False, default='general')
    count_per_week = serializers.IntegerField(required=False, default=3, min_value=1, max_value=7)
    weeks = serializers.IntegerField(required=False, default=4, min_value=1, max_value=12)
    client_id = serializers.IntegerField(required=False)


class TrainBrandVoiceRequestSerializer(serializers.Serializer):
    sample_posts = serializers.ListField(
        child=serializers.CharField(),
        help_text='At least 3 sample posts',
        min_length=3,
    )
    client_id = serializers.IntegerField(required=False)


class SaveHashtagSetRequestSerializer(serializers.Serializer):
    set_name = serializers.CharField()
    tags = serializers.ListField(child=serializers.CharField(), help_text='List of hashtags')


class ApproveIdeasRequestSerializer(serializers.Serializer):
    idea_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text='Specific idea ids; omit with approve_all=true',
    )
    approve_all = serializers.BooleanField(required=False, default=False)
