from django.core.management.base import BaseCommand

from social_stats.post_management_digest import run_post_management_client_digests


class Command(BaseCommand):
    help = (
        'Send Post Management digest emails (Draft / Pending Review / On Hold) '
        'to clients that have matching posts in the lookback window.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Log counts only; do not send email.',
        )

    def handle(self, *args, **options):
        result = run_post_management_client_digests(dry_run=options['dry_run'])
        self.stdout.write(self.style.SUCCESS(str(result)))
