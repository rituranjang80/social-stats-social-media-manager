# Error monitoring — ErrorLog model

import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('social_stats', '0065_unifiedpost_first_comment_tags'),
    ]

    operations = [
        migrations.CreateModel(
            name='ErrorLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('application_name', models.CharField(blank=True, db_index=True, max_length=128)),
                ('environment', models.CharField(
                    choices=[('Development', 'Development'), ('Staging', 'Staging'), ('Production', 'Production')],
                    db_index=True, default='Development', max_length=32,
                )),
                ('severity', models.CharField(
                    choices=[('INFO', 'Info'), ('WARNING', 'Warning'), ('ERROR', 'Error'), ('CRITICAL', 'Critical')],
                    db_index=True, default='ERROR', max_length=16,
                )),
                ('exception_type', models.CharField(db_index=True, max_length=255)),
                ('exception_message', models.TextField(blank=True)),
                ('full_stack_trace', models.TextField(blank=True)),
                ('python_file', models.TextField(blank=True)),
                ('function_name', models.CharField(blank=True, max_length=255)),
                ('class_name', models.CharField(blank=True, max_length=255)),
                ('line_number', models.PositiveIntegerField(blank=True, null=True)),
                ('source_module', models.CharField(blank=True, max_length=255)),
                ('request_url', models.TextField(blank=True)),
                ('request_method', models.CharField(blank=True, db_index=True, max_length=16)),
                ('request_path', models.CharField(blank=True, db_index=True, max_length=512)),
                ('query_parameters', models.JSONField(blank=True, default=dict)),
                ('request_body', models.JSONField(blank=True, default=dict)),
                ('http_headers', models.JSONField(blank=True, default=dict)),
                ('local_variables', models.JSONField(blank=True, default=dict)),
                ('response_status_code', models.PositiveSmallIntegerField(blank=True, db_index=True, null=True)),
                ('username', models.CharField(blank=True, db_index=True, max_length=150)),
                ('email', models.EmailField(blank=True, max_length=254)),
                ('client_ip', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True)),
                ('session_id', models.CharField(blank=True, max_length=64)),
                ('request_id', models.UUIDField(blank=True, db_index=True, null=True)),
                ('workspace_id', models.CharField(blank=True, db_index=True, max_length=64)),
                ('organization_id', models.CharField(blank=True, db_index=True, max_length=64)),
                ('execution_time_ms', models.PositiveIntegerField(blank=True, null=True)),
                ('server_hostname', models.CharField(blank=True, max_length=255)),
                ('process_id', models.PositiveIntegerField(blank=True, null=True)),
                ('thread_id', models.BigIntegerField(blank=True, null=True)),
                ('git_commit', models.CharField(blank=True, max_length=64)),
                ('api_name', models.CharField(blank=True, db_index=True, max_length=255)),
                ('serializer_name', models.CharField(blank=True, max_length=255)),
                ('model_name', models.CharField(blank=True, max_length=255)),
                ('view_name', models.CharField(blank=True, db_index=True, max_length=255)),
                ('database_query', models.TextField(blank=True)),
                ('database_error', models.TextField(blank=True)),
                ('suggestion', models.TextField(blank=True)),
                ('error_category', models.CharField(blank=True, db_index=True, max_length=128)),
                ('resolved', models.BooleanField(db_index=True, default=False)),
                ('resolved_at', models.DateTimeField(blank=True, null=True)),
                ('notes', models.TextField(blank=True)),
                ('authenticated_user', models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='error_logs', to=settings.AUTH_USER_MODEL,
                )),
                ('resolved_by', models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='resolved_error_logs', to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='errorlog',
            index=models.Index(fields=['-created_at'], name='social_stat_created_6a0f2d_idx'),
        ),
        migrations.AddIndex(
            model_name='errorlog',
            index=models.Index(fields=['severity', '-created_at'], name='social_stat_severit_0d8c2a_idx'),
        ),
        migrations.AddIndex(
            model_name='errorlog',
            index=models.Index(fields=['resolved', '-created_at'], name='social_stat_resolve_91ab3e_idx'),
        ),
        migrations.AddIndex(
            model_name='errorlog',
            index=models.Index(fields=['exception_type', '-created_at'], name='social_stat_excepti_4f2b1c_idx'),
        ),
    ]
