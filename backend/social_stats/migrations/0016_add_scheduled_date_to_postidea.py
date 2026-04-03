from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('social_stats', '0015_client_brand_assets_client_brand_description_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='postidea',
            name='scheduled_date',
            field=models.DateField(blank=True, null=True),
        ),
    ]
