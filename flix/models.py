from abc import abstractmethod
from django.db import models
from django.conf import settings
from django.core.files.storage import default_storage
from uuid import uuid4
from os.path import splitext
from pathlib import PurePosixPath
from django.utils import timezone
import re

FLIX_TYPES = ('movie', 'series')
invalid_file_chars = re.compile(r'[\\/:*?"<>|\s]+')

class MediaBase:

	@abstractmethod
	def video_path(self):
		pass

	@abstractmethod
	def video_url(self):
		return default_storage.url(self.video_path())

	@abstractmethod
	def video_path_exists(self):
		return default_storage.exists(self.video_path())

class TMDBModel(models.Model):
	tmdb_id = models.CharField(max_length=32, null=True, blank=True, unique=True)

	class Meta:
		abstract = True


def subtitle_by_vid_path(instance, filename):
	_, ext = splitext(filename)
	media = instance.media
	base = PurePosixPath(media.video_path()).parent
	filename_safe = invalid_file_chars.sub('-', instance.name)
	return (base / 'subtitles' / f"{filename_safe}{ext}").as_posix()
class SubtitleBase(models.Model):
	name = models.CharField(max_length=128)
	is_default = models.BooleanField(default=False)
	srclng = models.CharField(max_length=8, null=True, blank=True)
	subtitle = models.FileField(null=True, blank=True, upload_to=subtitle_by_vid_path)

	def save(self, *args, **kwargs):
		if self.pk:
			old = type(self).objects.filter(pk=self.pk).first()
			if old and old.subtitle and self.subtitle and old.subtitle.name != self.subtitle.name:
				old.subtitle.delete(save=False)
		super().save(*args, **kwargs)

	def delete(self, *args, **kwargs):
		if self.subtitle:
			self.subtitle.delete(save=False)
		super().delete(*args, **kwargs)

class MovieSubtitle(SubtitleBase):
	movie = models.ForeignKey('Movie', on_delete=models.CASCADE, related_name='subtitles')

	@property
	def media(self):
		return self.movie

class EpisodeSubtitle(SubtitleBase):
	episode = models.ForeignKey('Episode', on_delete=models.CASCADE, related_name='subtitles')

	@property
	def media(self):
		return self.episode

class FlixBaseModel(TMDBModel):
	id = models.UUIDField(primary_key=True, default=uuid4, editable=False)

	title = models.CharField(max_length=256)
	date_release = models.DateField()
	date_upload = models.DateTimeField(default=timezone.now)
	genres = models.ManyToManyField('Genre')
	poster_path = models.CharField(max_length=256)

	class Meta:
		abstract = True

class Genre(TMDBModel):
	name = models.CharField(max_length=128)

	def __str__(self):
		return self.name

class Movie(FlixBaseModel, MediaBase):

	def video_path(self):
		return f'movies/{self.tmdb_id}-{self.title.replace(" ", "-")}/video.mp4'
	
	def __str__(self):
		return self.title

class Series(FlixBaseModel):
	def __str__(self):
		return self.title

class Season(TMDBModel):
	series = models.ForeignKey(Series, on_delete=models.CASCADE, related_name='seasons')
	season_number = models.IntegerField()
	title = models.CharField(max_length=256)

class Episode(TMDBModel, MediaBase):
	season = models.ForeignKey(Season, on_delete=models.CASCADE, related_name='episodes')
	episode_number = models.IntegerField()
	title = models.CharField(max_length=256)

	def video_path(self):
		return f'series/{self.season.series.tmdb_id}-{self.season.series.title.replace(" ", "-")}/{self.season.title.replace(" ", "-")}/episode-{self.episode_number}-{self.title.replace(" ", "-")}/video.mp4'

	def __str__(self):
		return self.title 