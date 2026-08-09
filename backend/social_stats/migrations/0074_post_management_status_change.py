from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


POST_MANAGEMENT_STATUS_LOG_PERMISSION = (
    'post_management.view_status_log',
    'View post status history',
    'See who changed post status, when, and comments on Post Management',
    'pages',
    True,
    False,
    128,
    'post_management',
)


def seed_view_status_log_permission(apps, schema_editor):
    Permission = apps.get_model('social_stats', 'Permission')
    RolePermission = apps.get_model('social_stats', 'RolePermission')
    code, label, desc, category, default_staff, default_client, sort_order, page = (
        POST_MANAGEMENT_STATUS_LOG_PERMISSION
    )
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


def unseed_view_status_log_permission(apps, schema_editor):
    Permission = apps.get_model('social_stats', 'Permission')
    Permission.objects.filter(code='post_management.view_status_log').delete()


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('social_stats', '0073_errorlog_screenshot_path'),
    ]

    operations = [
        migrations.CreateModel(
            name='PostManagementStatusChange',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('post_source', models.CharField(choices=[('composer', 'Composer (UnifiedPost)'), ('calendar', 'Calendar (legacy)')], max_length=16)),
                ('post_id', models.PositiveIntegerField()),
                ('from_status', models.CharField(max_length=32)),
                ('to_status', models.CharField(max_length=32)),
                ('comment', models.TextField(blank=True)),
                ('changed_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('changed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='post_management_status_changes', to=settings.AUTH_USER_MODEL)),
                ('client', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='post_management_status_changes', to='social_stats.client')),
            ],
            options={
                'ordering': ['-changed_at'],
                'indexes': [
                    models.Index(fields=['client', '-changed_at'], name='social_stat_client__pm_sc_idx'),
                    models.Index(fields=['post_source', 'post_id', '-changed_at'], name='social_stat_post_sr_pm_sc_idx'),
                ],
            },
        ),
        migrations.RunPython(seed_view_status_log_permission, unseed_view_status_log_permission),
    ]
