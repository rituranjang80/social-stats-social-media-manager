# Remove instagram_basic from Privacy Policy scope list.
# instagram_manage_insights supersedes it.

from django.db import migrations


def update_privacy(apps, schema_editor):
    SiteContent = apps.get_model('social_stats', 'SiteContent')
    try:
        pp = SiteContent.objects.get(key='privacy-policy')
    except SiteContent.DoesNotExist:
        return

    sections = pp.content.get('sections', [])
    for section in sections:
        if 'Facebook & Instagram' in (section.get('title') or ''):
            html = section.get('html', '')
            # Remove the instagram_basic line
            html = html.replace(
                '<li><code>instagram_basic</code> — access basic Instagram account information</li>',
                ''
            )
            section['html'] = html
            break

    pp.content['sections'] = sections
    pp.save(update_fields=['content'])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('social_stats', '0030_widen_postmetric_url_fields'),
    ]

    operations = [
        migrations.RunPython(update_privacy, noop),
    ]
