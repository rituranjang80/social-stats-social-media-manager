# Generated migration — Client.public_id for opaque workspace URLs
import uuid

from django.db import migrations, models


def backfill_client_public_ids(apps, schema_editor):
    Client = apps.get_model('social_stats', 'Client')
    for row in Client.objects.filter(public_id__isnull=True).iterator():
        row.public_id = uuid.uuid4()
        row.save(update_fields=['public_id'])


class Migration(migrations.Migration):

    dependencies = [
        ('social_stats', '0066_errorlog'),
    ]

    operations = [
        migrations.AddField(
            model_name='client',
            name='public_id',
            field=models.UUIDField(db_index=True, editable=False, null=True),
        ),
        migrations.RunPython(backfill_client_public_ids, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='client',
            name='public_id',
            field=models.UUIDField(db_index=True, default=uuid.uuid4, editable=False, unique=True),
        ),
    ]
