# Encrypt existing OAuth tokens at rest using Fernet (AES-128-CBC).

from django.db import migrations
import social_stats.fields


def encrypt_existing_tokens(apps, schema_editor):
    """Encrypt all plaintext OAuth tokens already in the database."""
    from social_stats.crypto import encrypt_value
    from django.db import connection

    with connection.cursor() as cur:
        cur.execute(
            "SELECT id, access_token, refresh_token "
            "FROM social_stats_platformcredential"
        )
        for row_id, at, rt in cur.fetchall():
            new_at = encrypt_value(at) if at else ''
            new_rt = encrypt_value(rt) if rt else ''
            if new_at != at or new_rt != rt:
                cur.execute(
                    "UPDATE social_stats_platformcredential "
                    "SET access_token = %s, refresh_token = %s WHERE id = %s",
                    [new_at, new_rt, row_id],
                )


def decrypt_existing_tokens(apps, schema_editor):
    """Reverse: decrypt tokens back to plaintext."""
    from social_stats.crypto import decrypt_value
    from django.db import connection

    with connection.cursor() as cur:
        cur.execute(
            "SELECT id, access_token, refresh_token "
            "FROM social_stats_platformcredential"
        )
        for row_id, at, rt in cur.fetchall():
            new_at = decrypt_value(at) if at else ''
            new_rt = decrypt_value(rt) if rt else ''
            if new_at != at or new_rt != rt:
                cur.execute(
                    "UPDATE social_stats_platformcredential "
                    "SET access_token = %s, refresh_token = %s WHERE id = %s",
                    [new_at, new_rt, row_id],
                )


class Migration(migrations.Migration):

    dependencies = [
        ('social_stats', '0026_update_terms_privacy_content'),
    ]

    operations = [
        # 1. Encrypt existing plaintext tokens
        migrations.RunPython(encrypt_existing_tokens, decrypt_existing_tokens),
        # 2. Tell Django the field class has changed (no DB schema change)
        migrations.AlterField(
            model_name='platformcredential',
            name='access_token',
            field=social_stats.fields.EncryptedTextField(blank=True),
        ),
        migrations.AlterField(
            model_name='platformcredential',
            name='refresh_token',
            field=social_stats.fields.EncryptedTextField(blank=True),
        ),
    ]
