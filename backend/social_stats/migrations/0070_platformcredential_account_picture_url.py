from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('social_stats', '0069_client_invitation_welcome_email'),
    ]

    operations = [
        migrations.AddField(
            model_name='platformcredential',
            name='account_picture_url',
            field=models.URLField(blank=True, help_text='Page/channel profile image from the social platform'),
        ),
    ]
