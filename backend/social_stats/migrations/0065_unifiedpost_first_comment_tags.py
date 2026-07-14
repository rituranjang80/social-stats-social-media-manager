# Generated manually for UnifiedPost first_comment / tags / internal_notes

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('social_stats', '0064_rename_gateway_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='unifiedpost',
            name='first_comment',
            field=models.TextField(
                blank=True,
                help_text='Optional first comment after publish',
            ),
        ),
        migrations.AddField(
            model_name='unifiedpost',
            name='tags',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Internal tags ["launch","client-x"]',
            ),
        ),
        migrations.AddField(
            model_name='unifiedpost',
            name='internal_notes',
            field=models.TextField(
                blank=True,
                help_text='Team-only notes, not published',
            ),
        ),
    ]
