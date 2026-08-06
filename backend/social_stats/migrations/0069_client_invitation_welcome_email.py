# Client invitation welcome email + soft delete + token single-use
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('social_stats', '0068_rename_social_stat_created_6a0f2d_idx_social_stat_created_7bdd14_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='client',
            name='is_deleted',
            field=models.BooleanField(default=False, db_index=True),
        ),
        migrations.AddField(
            model_name='client',
            name='last_invitation_sent_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='clientinvitation',
            name='token_used_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
