from rest_framework import serializers
from djoser.serializers import UserCreateSerializer
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.tokens import AccessToken
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


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
	def validate(self, attrs):
		data = super().validate(attrs)
		refresh = self.get_token(self.user)
		data['access_expiration'] = refresh.access_token.payload['exp']
		data['refresh_expiration'] = refresh.payload['exp']
		return data


class CustomTokenRefreshSerializer(TokenRefreshSerializer):
	def validate(self, attrs):
		data = super().validate(attrs)
		access = AccessToken(data['access'])
		data['access_expiration'] = access.payload['exp']
		return data