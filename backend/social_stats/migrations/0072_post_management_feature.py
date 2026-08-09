from django.db import migrations, models


POST_MANAGEMENT_PERMISSIONS = [
    (
        'post_management.view',
        'View Post Management',
        'Access the post management page (upcoming posts)',
        'pages',
        True,
        True,
        125,
        'post_management',
    ),
    (
        'post_management.change_status',
        'Change Post Status',
        'Update workflow status on upcoming posts',
        'actions',
        True,
        False,
        126,
        'post_management',
    ),
    (
        'post_management.configure',
        'Configure Post Management',
        'Enable or disable post management for a workspace',
        'actions',
        True,
        False,
        127,
        'post_management',
    ),
]


def seed_post_management(apps, schema_editor):
    Permission = apps.get_model('social_stats', 'Permission')
    RolePermission = apps.get_model('social_stats', 'RolePermission')
    ClientPageConfig = apps.get_model('social_stats', 'ClientPageConfig')

    for code, label, desc, category, default_staff, default_client, sort_order, page in POST_MANAGEMENT_PERMISSIONS:
        perm, _ = Permission.objects.update_or_create(
            code=code,
            defaults={
                'label': label,
                'description': desc,
                'category': category,
                'page': page,
                'is_default_staff': default_staff,
                'is_default_client': default_client,
                'sort_order': sort_order,
            },
        )
        RolePermission.objects.update_or_create(
            role='staff', permission=perm, defaults={'is_granted': default_staff},
        )
        RolePermission.objects.update_or_create(
            role='client', permission=perm, defaults={'is_granted': default_client},
        )


def unseed_post_management(apps, schema_editor):
    Permission = apps.get_model('social_stats', 'Permission')
    Permission.objects.filter(code__startswith='post_management.').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('social_stats', '0071_alter_platformcredential_account_picture_url'),
    ]

    operations = [
        migrations.AddField(
            model_name='clientpageconfig',
            name='show_post_management',
            field=models.BooleanField(default=True),
        ),
        migrations.RunPython(seed_post_management, unseed_post_management),
    ]
