from rest_framework import serializers
from .models import (
	MovieRating,
	SeriesRating,
	MovieComment,
	SeriesComment,
)
from rest_framework.validators import UniqueTogetherValidator

class MovieRatingSerializer(serializers.ModelSerializer):
	class Meta:
		model = MovieRating
		fields = [
			'flix',
			'user',
			'value',
		]
		read_only_fields = [
			'flix',
			'user',
		]
		
	def create(self, validated_data):
		if not MovieRating.objects.filter(user=validated_data.get('user')).exists():
			return MovieRating.objects.create(**validated_data)
		raise serializers.ValidationError('user can only rate flix once')

class SeriesRatingSerializer(serializers.ModelSerializer):
	class Meta:
		model = SeriesRating
		fields = [
			'flix',
			'user',
			'value',
		]
		read_only_fields = [
			'flix',
			'user',
		]

	def create(self, validated_data):
		if not MovieRating.objects.filter(user=validated_data.get('user')).exists():
			return SeriesRating.objects.create(**validated_data)
		raise serializers.ValidationError('user can only rate flix once')

class MovieCommentSerializer(serializers.ModelSerializer):
	class Meta:
		model = MovieComment
		fields = [
			'id',
			'flix',
			'user',
			'comment',
			'date',
		]
		read_only_fields = [
			'flix',
			'user',
			'date',
		]

class SeriesCommentSerializer(serializers.ModelSerializer):
	class Meta:
		model = SeriesComment
		fields = [
			'id',
			'flix',
			'user',
			'comment',
			'date',
		]
		read_only_fields = [
			'flix',
			'user',
			'date',
		]