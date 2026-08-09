# Post Management — persisted status change audit trail
from __future__ import annotations

from django.contrib.auth.models import User
from django.db import models


class PostManagementStatusChange(models.Model):
    POST_SOURCES = [
        ('composer', 'Composer (UnifiedPost)'),
        ('calendar', 'Calendar (legacy)'),
    ]

    client = models.ForeignKey(
        'social_stats.Client',
        on_delete=models.CASCADE,
        related_name='post_management_status_changes',
    )
    post_source = models.CharField(max_length=16, choices=POST_SOURCES)
    post_id = models.PositiveIntegerField()
    from_status = models.CharField(max_length=32)
    to_status = models.CharField(max_length=32)
    comment = models.TextField(blank=True)
    changed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='post_management_status_changes',
    )
    changed_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-changed_at']
        indexes = [
            models.Index(fields=['client', '-changed_at']),
            models.Index(fields=['post_source', 'post_id', '-changed_at']),
        ]

    def __str__(self) -> str:
        return f'PM status {self.post_source}:{self.post_id} {self.from_status}→{self.to_status}'
