# ============================================================================
#  Social Stats — seed sample Unified Inbox threads for UI / QA.
#  Usage: python manage.py seed_inbox_demo [--client ID] [--replace]
# ==========================================================================
"""
Creates Conversation + Message rows (and optional demo PlatformCredentials)
so **Analytics → Inbox** filters, threading, star/archive/resolve, and
demo replies work without live OAuth.

Thread ids are prefixed ``demo-inbox-`` — safe to re-run with ``--replace``.
"""
from __future__ import annotations

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from social_stats.models import Client, Conversation, Message, PlatformCredential

DEMO_PREFIX = 'demo-inbox-'
DEMO_CRED_TOKEN = 'demo_inbox_seed'

PLATFORMS = ['facebook', 'instagram', 'youtube', 'linkedin', 'google_my_business']


def _specs(now):
    """Sample threads covering type, platform, sentiment, and inbox flags."""
    return [
        {
            'key': 'fb-comment-unread-star',
            'platform': 'facebook',
            'type': 'comment',
            'contact_name': 'Priya Sharma',
            'contact_handle': 'priya.sharma',
            'sentiment': 'positive',
            'unread_count': 2,
            'is_starred': True,
            'offset_hours': 1,
            'preview': 'Love this campaign — can we get pricing?',
            'messages': [
                {
                    'direction': 'inbound',
                    'author_name': 'Priya Sharma',
                    'content': 'Love this campaign — can we get pricing for 3 months?',
                    'platform_message_id': 'demo-cmt-fb-1',
                    'ai_suggested_reply': 'Thanks Priya! I will send our rate card by email today.',
                },
                {
                    'direction': 'inbound',
                    'author_name': 'Priya Sharma',
                    'content': 'Also interested in Instagram reels package.',
                    'platform_message_id': 'demo-cmt-fb-2',
                },
            ],
        },
        {
            'key': 'ig-dm-unread',
            'platform': 'instagram',
            'type': 'dm',
            'contact_name': 'Alex Rivera',
            'contact_handle': 'ig_psid_8842',
            'sentiment': 'neutral',
            'unread_count': 1,
            'offset_hours': 3,
            'preview': 'Hey! Is this product still available?',
            'messages': [
                {
                    'direction': 'inbound',
                    'author_name': 'Alex Rivera',
                    'author_handle': 'ig_psid_8842',
                    'content': 'Hey! Is this product still available in Mumbai?',
                    'platform_message_id': 'demo-dm-ig-1',
                    'ai_suggested_reply': 'Hi Alex — yes, we ship to Mumbai. Want me to share the link?',
                },
            ],
        },
        {
            'key': 'yt-comment-negative',
            'platform': 'youtube',
            'type': 'comment',
            'contact_name': 'Demo Refund User',
            'contact_handle': 'refund_demo',
            'sentiment': 'negative',
            'unread_count': 1,
            'offset_hours': 5,
            'preview': 'Video audio is too low — please fix',
            'messages': [
                {
                    'direction': 'inbound',
                    'author_name': 'Demo Refund User',
                    'content': 'Video audio is too low — please fix or I want a refund demo.',
                    'platform_message_id': 'demo-cmt-yt-1',
                    'sentiment': 'negative',
                },
            ],
        },
        {
            'key': 'li-mention',
            'platform': 'linkedin',
            'type': 'mention',
            'contact_name': 'Jordan Lee',
            'contact_handle': 'jordan-lee-b2b',
            'sentiment': 'positive',
            'unread_count': 0,
            'offset_hours': 8,
            'preview': '@YourBrand great thought leadership post',
            'messages': [
                {
                    'direction': 'inbound',
                    'author_name': 'Jordan Lee',
                    'content': '@YourBrand great thought leadership post — shared with our team.',
                    'platform_message_id': 'demo-mention-li-1',
                },
                {
                    'direction': 'outbound',
                    'author_name': 'Social Stats Team',
                    'content': 'Thank you Jordan — glad it resonated!',
                    'platform_message_id': 'demo-out-li-1',
                },
            ],
        },
        {
            'key': 'gmb-review',
            'platform': 'google_my_business',
            'type': 'review',
            'contact_name': 'Meera Patel',
            'contact_handle': 'meera.patel',
            'sentiment': 'positive',
            'unread_count': 1,
            'offset_hours': 12,
            'preview': '★★★★★ Excellent service and quick response',
            'messages': [
                {
                    'direction': 'inbound',
                    'author_name': 'Meera Patel',
                    'content': '★★★★★ Excellent service and quick response on WhatsApp.',
                    'platform_message_id': 'demo-review-gmb-1',
                    'ai_suggested_reply': 'Thank you Meera! We appreciate your kind words.',
                },
            ],
        },
        {
            'key': 'ig-comment-read',
            'platform': 'instagram',
            'type': 'comment',
            'contact_name': 'Sam Okonkwo',
            'contact_handle': 'sam.o',
            'sentiment': 'neutral',
            'unread_count': 0,
            'offset_hours': 20,
            'preview': 'What time is the live session?',
            'messages': [
                {
                    'direction': 'inbound',
                    'author_name': 'Sam Okonkwo',
                    'content': 'What time is the live session tomorrow?',
                    'platform_message_id': 'demo-cmt-ig-1',
                },
            ],
        },
        {
            'key': 'fb-dm-resolved',
            'platform': 'facebook',
            'type': 'dm',
            'contact_name': 'Bob Chen',
            'contact_handle': 'fb_psid_9911',
            'sentiment': 'negative',
            'unread_count': 0,
            'is_resolved': True,
            'offset_hours': 30,
            'preview': 'Issue resolved — thanks for the help',
            'messages': [
                {
                    'direction': 'inbound',
                    'author_name': 'Bob Chen',
                    'author_handle': 'fb_psid_9911',
                    'content': 'My order was delayed — need an update.',
                    'platform_message_id': 'demo-dm-fb-1',
                    'sentiment': 'negative',
                },
                {
                    'direction': 'outbound',
                    'author_name': 'Support',
                    'content': 'Sorry about the delay — your order ships today.',
                    'platform_message_id': 'demo-out-fb-1',
                },
                {
                    'direction': 'inbound',
                    'author_name': 'Bob Chen',
                    'content': 'Issue resolved — thanks for the help',
                    'platform_message_id': 'demo-dm-fb-2',
                    'sentiment': 'positive',
                },
            ],
        },
        {
            'key': 'fb-comment-archived',
            'platform': 'facebook',
            'type': 'comment',
            'contact_name': 'Archived Thread',
            'contact_handle': 'archived.demo',
            'sentiment': 'neutral',
            'unread_count': 0,
            'is_archived': True,
            'offset_hours': 48,
            'preview': 'Old promo thread (archived sample)',
            'messages': [
                {
                    'direction': 'inbound',
                    'author_name': 'Archived Thread',
                    'content': 'Old promo thread (archived sample) — hidden from default list.',
                    'platform_message_id': 'demo-cmt-archived-1',
                },
            ],
        },
    ]


class Command(BaseCommand):
    help = 'Seed demo inbox conversations for /admin/analytics/inbox QA'

    def add_arguments(self, parser):
        parser.add_argument('--client', type=int, default=None, help='Seed one client id only')
        parser.add_argument('--replace', action='store_true', help='Delete prior demo-inbox-* threads first')
        parser.add_argument(
            '--skip-credentials',
            action='store_true',
            help='Do not create demo PlatformCredential rows for replies',
        )

    def handle(self, *args, **options):
        cid = options['client']
        replace = options['replace']
        skip_cred = options['skip_credentials']

        clients = Client.objects.filter(pk=cid) if cid else Client.objects.filter(is_active=True)
        if not clients.exists():
            self.stderr.write(self.style.ERROR('No matching clients.'))
            return

        now = timezone.now()
        specs = _specs(now)
        total_conv = 0
        total_msg = 0

        for client in clients:
            if replace:
                deleted, _ = Conversation.objects.filter(
                    client=client,
                    platform_thread_id__startswith=DEMO_PREFIX,
                ).delete()
                if deleted:
                    self.stdout.write(f'  Removed {deleted} demo rows for {client.company}')

            if not skip_cred:
                self._ensure_demo_credentials(client)

            for spec in specs:
                thread_id = f'{DEMO_PREFIX}{spec["key"]}'
                if Conversation.objects.filter(
                    client=client, platform=spec['platform'], platform_thread_id=thread_id,
                ).exists():
                    continue

                last_at = now - timedelta(hours=spec.get('offset_hours', 1))
                conv = Conversation.objects.create(
                    client=client,
                    platform=spec['platform'],
                    platform_thread_id=thread_id,
                    type=spec['type'],
                    contact_name=spec['contact_name'],
                    contact_handle=spec.get('contact_handle', ''),
                    last_message_preview=spec.get('preview', '')[:500],
                    last_message_at=last_at,
                    unread_count=spec.get('unread_count', 0),
                    is_starred=spec.get('is_starred', False),
                    is_archived=spec.get('is_archived', False),
                    is_resolved=spec.get('is_resolved', False),
                    sentiment=spec.get('sentiment', 'unknown'),
                )
                total_conv += 1

                base_time = last_at - timedelta(minutes=len(spec['messages']) * 5)
                for i, m in enumerate(spec['messages']):
                    sent = base_time + timedelta(minutes=i * 5)
                    Message.objects.create(
                        conversation=conv,
                        platform_message_id=m.get('platform_message_id', ''),
                        direction=m.get('direction', 'inbound'),
                        author_name=m.get('author_name', ''),
                        author_handle=m.get('author_handle', ''),
                        content=m.get('content', ''),
                        sent_at=sent,
                        sentiment=m.get('sentiment', spec.get('sentiment', 'unknown')),
                        ai_suggested_reply=m.get('ai_suggested_reply', ''),
                    )
                    total_msg += 1

            self.stdout.write(self.style.SUCCESS(f'✓ {client.company} (id={client.id})'))

        self.stdout.write(self.style.SUCCESS(
            f'\nDone — {total_conv} conversations, {total_msg} messages created '
            f'(skipped existing demo threads unless --replace).'
        ))
        self.stdout.write(
            'Open Inbox with a workspace selected. Demo replies need INBOX_DEMO_REPLY=true '
            'and demo credentials (created unless --skip-credentials).'
        )

    def _ensure_demo_credentials(self, client):
        for platform in PLATFORMS:
            cred, created = PlatformCredential.objects.get_or_create(
                client=client,
                platform=platform,
                defaults={
                    'access_token': DEMO_CRED_TOKEN,
                    'page_id': 'demo-inbox-page',
                    'page_name': 'Demo Inbox',
                    'is_active': True,
                    'auth_method': 'manual_token',
                },
            )
            if created:
                self.stdout.write(f'    + demo credential: {platform}')
