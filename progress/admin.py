from django.contrib import admin
from .models import UserMediaProgress


@admin.register(UserMediaProgress)
class UserMediaProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'content_type', 'object_id', 'last_position_seconds', 'duration_seconds', 'is_finished', 'last_watched_at')
    list_filter = ('is_finished', 'content_type')
    search_fields = ('user__username', 'user__email', 'object_id')
    readonly_fields = ('last_watched_at',)
