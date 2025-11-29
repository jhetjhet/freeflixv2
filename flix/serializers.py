from django.conf import settings
from rest_framework import serializers

from .models import (
	EpisodeSubtitle,
	Genre,
	Movie,
	MovieSubtitle, 
	Series, 
	Season, 
	Episode,
	FLIX_TYPES,
	SubtitleBase,
)

import json
import re

class GenreSerializer(serializers.ModelSerializer):
	movie_count = serializers.SerializerMethodField()
	series_count = serializers.SerializerMethodField()

	class Meta:
		model = Genre
		fields = [
			'tmdb_id',
			'name',
			'movie_count',
			'series_count',
		]
		read_only_fields = [
			'movie_count',
			'series_count',
		]

	def get_movie_count(self, obj):
		return obj.movie_set.all().count()

	def get_series_count(self, obj):
		return obj.series_set.all().count()

class SubtitleSerializer(serializers.ModelSerializer):
	subtitle_url = serializers.SerializerMethodField()

	class Meta:
		model = SubtitleBase
		fields = [
			'id',
			'name',
			'is_default',
			'subtitle',
			'subtitle_url',
			'srclng',
		]
		extra_kwargs = {'subtitle': {'required': True, 'write_only': True}}

	def get_subtitle_url(self, obj):
		if obj.subtitle:
			return f"{settings.MEDIA_URL}{obj.subtitle.name}"  # returns the relative path, not the full URL
		return None

class MovieSubtitleSerializer(SubtitleSerializer):
	movie = serializers.SlugRelatedField(read_only=True, slug_field='tmdb_id')

	class Meta(SubtitleSerializer.Meta):
		model = MovieSubtitle
		fields = SubtitleSerializer.Meta.fields + [
			'movie',
		]
		read_only_fields = ['movie']

class EpisodeSubtitleSerializer(SubtitleSerializer):
	episode = serializers.SlugRelatedField(read_only=True, slug_field='episode_number')
	season = serializers.SlugRelatedField(read_only=True, slug_field='season_number')

	class Meta(SubtitleSerializer.Meta):
		model = EpisodeSubtitle
		fields = SubtitleSerializer.Meta.fields + [
			'episode',
			'season',
			# 'series',
		]

class MovieSerializer(serializers.ModelSerializer):
	genres = GenreSerializer(many=True, required=False)
	video_path = serializers.ReadOnlyField()
	video_url = serializers.ReadOnlyField()
	video_path_exists = serializers.ReadOnlyField()
	subtitles = MovieSubtitleSerializer(many=True, read_only=True)

	class Meta:
		model = Movie
		fields = [
			'id',
			'tmdb_id',
			'title',
			# 'video_url',
			# 'video',
			'video_path',
			'video_url',
			'video_path_exists',
			'date_release',
			'date_upload',
			'genres',
			'poster_path',
			'subtitles',
		]
		read_only_fields = [
			'id',
			'date_upload',
		]
		# extra_kwargs = {'video': {'write_only': True}}

	def get_video_url(self, obj):
		return obj.video_url()

	def create(self, validated_data):
		genres = validated_data.pop('genres', [])

		movie = Movie.objects.create(**validated_data)

		for genre in genres:
			genre_obj = Genre.objects.get_or_create(**genre)[0]
			movie.genres.add(genre_obj)
		return movie

	def update(self, instance, validated_data):
		genres = validated_data.pop('genres', [])

		instance = super().update(instance, validated_data)

		if genres:
			instance.genres.clear()
			for genre in genres:
				genre_obj = Genre.objects.get_or_create(**genre)[0]
				instance.genres.add(genre_obj)

		return instance

	def validate_title(self, value):
		# Sanitize or transform unsafe strings here
		safe_title = re.sub(r'[^\w\s-]', '', value).strip().lower()
		safe_title = re.sub(r'[-\s]+', '-', safe_title)
		return safe_title

	def validate(self, data):
		data = data.copy()  # Make a mutable copy to avoid QueryDict immutability

		if data['genres']:
			try:
				data['genres'] = json.loads(data['genres'])
			except TypeError:
				raise serializers.ValidationError({
					'genres': 'Object with tmdb_id and name is required',
				})

		return super().validate(data)

	def to_internal_value(self, data):
		data = data.copy()  # Make a mutable copy to avoid QueryDict immutability

		genres = data.pop('genres', [])

		data = super().to_internal_value(data)

		if isinstance(genres, list) and genres:
			data['genres'] = genres[0]
		else:
			data['genres'] = genres

		# return data
		return data

	# def get_subtitle_url(self, obj):

	# 	if not obj.subtitle:
	# 		return None

	# 	return obj.subtitle.url

class EpisodeSerializer(serializers.ModelSerializer):
	season = serializers.SlugRelatedField(read_only=True, slug_field='season_number')
	# video_url = serializers.SerializerMethodField()
	subtitles = EpisodeSubtitleSerializer(many=True, read_only=True)
	video_path = serializers.ReadOnlyField()
	video_url = serializers.ReadOnlyField()
	video_path_exists = serializers.ReadOnlyField()

	class Meta:
		model = Episode
		fields = [
			'tmdb_id',
			'season',
			'episode_number',
			'title', 
			'video_path',
			'video_url',
			'video_path_exists',
			'subtitles',
			# 'subtitle_url',
			# 'video', 
			# 'video_url',
		]
		read_only_fields = [
			'id',
		]
		# extra_kwargs = {'video': {'write_only': True}}

	def get_video_url(self, obj):
		return obj.video_url()

	def validate_title(self, value):
		# Sanitize or transform unsafe strings here
		safe_title = re.sub(r'[^\w\s-]', '', value).strip().lower()
		safe_title = re.sub(r'[-\s]+', '-', safe_title)
		return safe_title

	# def get_video_url(self, obj):
	# 	return obj.video.url

class SeasonSerializer(serializers.ModelSerializer):
	# episodes = serializers.SlugRelatedField(read_only=True, many=True, slug_field='title')

	episodes = EpisodeSerializer(many=True, read_only=True)
	# # episodes = serializers.SerializerMethodField()
	# # seasons = SeasonSerializer(many=True, read_only=True)

	# # def get_episodes(self, obj):
	# # 	return [
	# # 		{
	# # 			'title': episode.title,
	# # 			'episode_number': episode.episode_number,
	# # 			'tmdb_id': episode.tmdb_id,
	# # 		}
	# # 		for episode in obj.episodes.all()
	# # 	]

	class Meta:
		model = Season
		fields = [
			'episodes', 
			'title', 
			'season_number', 
			'tmdb_id',
		]
		read_only_fields = [
			'id', 
		]


class SeriesSerializer(serializers.ModelSerializer):
	seasons = SeasonSerializer(many=True, read_only=True)
	genres = GenreSerializer(many=True, read_only=False)

	class Meta:
		model = Series
		fields = [
			'id',
			'tmdb_id',
			'title',
			'date_release',
			'date_upload',
			'seasons',
			'genres',
			'poster_path',
		]
		read_only_fields = [
			'id',
			'date_upload',
		]

	def validate(self, data):

		serializers.ValidationError("finish must occur after start")

		return data

	def create(self, validated_data):
		genres = validated_data.pop('genres', [])
		series = Series.objects.create(**validated_data)
		
		for genre in genres:
			genre_obj, _ = Genre.objects.get_or_create(**genre)
			series.genres.add(genre_obj)
		return series