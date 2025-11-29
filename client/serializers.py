from rest_framework import serializers
from djoser.serializers import UserCreateSerializer
from .models import Flixer

class FlixerSerializer(serializers.ModelSerializer):
	class Meta:
		model = Flixer
		fields = [
			'id',
			'email',
			'username',
		]
		read_only_fields = [
			'id',
			'email',
			'username',
		]

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