from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('social_stats', '0072_post_management_feature'),
    ]

    operations = [
        migrations.AddField(
            model_name='errorlog',
            name='screenshot_path',
            field=models.CharField(
                blank=True,
                help_text='Relative path under MEDIA_ROOT (e.g. error_screenshots/<id>.png)',
                max_length=512,
            ),
        ),
    ]
