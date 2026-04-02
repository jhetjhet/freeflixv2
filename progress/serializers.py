from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from flix.models import Movie, Episode
from .models import UserMediaProgress


MEDIA_TYPE_MAP = {
    'movie': Movie,
    'episode': Episode,
}


class ProgressEmbedSerializer(serializers.ModelSerializer):
    """Read-only serializer for embedding progress data inside Media responses."""

    class Meta:
        model = UserMediaProgress
        fields = [
            'last_position_seconds',
            'duration_seconds',
            'progress_seconds',
            'is_finished',
            'last_watched_at',
        ]
        read_only_fields = fields


class UserMediaProgressSerializer(serializers.ModelSerializer):
    media_type = serializers.ChoiceField(
        choices=list(MEDIA_TYPE_MAP.keys()),
        write_only=True,
    )
    media_id = serializers.CharField(write_only=True)

    class Meta:
        model = UserMediaProgress
        fields = [
            'media_type',
            'media_id',
            'last_position_seconds',
            'duration_seconds',
            'progress_seconds',
            'is_finished',
            'last_watched_at',
        ]
        read_only_fields = ['last_watched_at']

    def validate(self, attrs):
        media_type = attrs.pop('media_type')
        media_id = attrs.pop('media_id')

        media_class = MEDIA_TYPE_MAP[media_type]
        content_type = ContentType.objects.get_for_model(media_class)

        try:
            media_obj = media_class.objects.get(pk=media_id)
        except (media_class.DoesNotExist, ValueError):
            raise serializers.ValidationError(
                {'media_id': f'{media_type} with id "{media_id}" does not exist.'}
            )

        attrs['content_type'] = content_type
        attrs['object_id'] = str(media_obj.pk)
        return attrs

    def create(self, validated_data):
        user = self.context['request'].user
        content_type = validated_data.pop('content_type')
        object_id = validated_data.pop('object_id')

        instance, _ = UserMediaProgress.objects.update_or_create(
            user=user,
            content_type=content_type,
            object_id=object_id,
            defaults=validated_data,
        )
        return instance
