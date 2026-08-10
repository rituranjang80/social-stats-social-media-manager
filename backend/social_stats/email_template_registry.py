# ============================================================================
#  Configurable transactional email templates (SiteContent-backed).
# ============================================================================
from __future__ import annotations

EMAIL_TEMPLATE_DEFINITIONS = {
    'welcome': {
        'site_key': 'welcome-email-template',
        'legacy_keys': ('client-invitation-email',),
        'title': 'Welcome template',
        'description': 'Sent when you invite a new client to accept their workspace.',
        'placeholders': [
            '{{company_name}}',
            '{{company_logo}}',
            '{{client_name}}',
            '{{client_email}}',
            '{{accept_invitation_url}}',
            '{{login_url}}',
            '{{support_email}}',
            '{{support_phone}}',
            '{{current_year}}',
            '{{agency_name}}',
            '{{message}}',
        ],
    },
    'client-approval': {
        'site_key': 'client-approval-email-template',
        'legacy_keys': (),
        'title': 'Client approval template',
        'description': (
            'Monthly digest when Draft, Pending Review, or On Hold posts exist '
            'for a workspace (Post Management).'
        ),
        'placeholders': [
            '{{company_name}}',
            '{{company_logo}}',
            '{{client_name}}',
            '{{client_email}}',
            '{{period_from}}',
            '{{period_to}}',
            '{{draft_count}}',
            '{{pending_review_count}}',
            '{{on_hold_count}}',
            '{{total_count}}',
            '{{stats_html}}',
            '{{post_management_url}}',
            '{{login_url}}',
            '{{support_email}}',
            '{{current_year}}',
        ],
    },
}


def template_slugs():
    return list(EMAIL_TEMPLATE_DEFINITIONS.keys())


def get_definition(slug: str) -> dict | None:
    return EMAIL_TEMPLATE_DEFINITIONS.get(slug)
