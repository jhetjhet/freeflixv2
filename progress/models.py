from django.db import models
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class UserMediaProgress(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='media_progress',
    )
    # GenericForeignKey to support both Movie (UUID pk) and Episode (int pk)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.CharField(max_length=64)
    media = GenericForeignKey('content_type', 'object_id')

    last_position_seconds = models.FloatField(default=0)
    duration_seconds = models.FloatField(default=0)
    progress_seconds = models.FloatField(default=0)
    last_watched_at = models.DateTimeField(auto_now=True)
    is_finished = models.BooleanField(default=False)

    class Meta:
        db_table = 'user_media_progress'
        unique_together = [('user', 'content_type', 'object_id')]
        indexes = [
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['user', 'last_watched_at']),
        ]

    def __str__(self):
        return f'{self.user} - {self.content_type.model}:{self.object_id}'
