from rest_framework import serializers
from djoser.serializers import UserCreateSerializer
from .models import Flixer

class FlixerSerializer(serializers.ModelSerializer):
	can_create_flix = serializers.SerializerMethodField()

	class Meta:
		model = Flixer
		fields = [
			'id',
			'email',
			'username',
			'can_create_flix',
		]
		read_only_fields = [
			'id',
			'email',
			'username',
			'can_create_flix',
		]

	def get_can_create_flix(self, obj):
		return any([
			obj.has_perm('flix.add_movie'),
			obj.has_perm('flix.add_series'),
			obj.has_perm('flix.add_season'),
			obj.has_perm('flix.add_episode'),
			obj.has_perm('flix.add_moviesubtitle'),
			obj.has_perm('flix.add_episodesubtitle'),
		])

class FlixerCreateSerializer(UserCreateSerializer):
	class Meta(UserCreateSerializer.Meta):
		model = Flixer
		fields = [
			'id',
			'email',
			'username',
			'password',
		]
		extra_kwargs = {'password': {'write_only': True}}