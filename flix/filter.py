from rest_framework.filters import SearchFilter, BaseFilterBackend
import operator
from functools import reduce
from django.db import models
from queryset_sequence import QuerySetSequence

class SequenceSearchFilter(SearchFilter):

	def filter_queryset(self, request, querysets, view):
		search_fields = self.get_search_fields(view, request)
		search_terms = self.get_search_terms(request)

		queryset1, queryset2 = querysets

		if not search_fields or not search_terms:
			return QuerySetSequence(queryset1, queryset2)

		# Both models share the same model and so field types (FlixBaseModel), 
		# so the generated lookup strings (e.g., 'title__icontains') 
		# are identical and can be reused for both querysets.
		orm_lookups = [
			self.construct_search(str(search_field), queryset1)
			for search_field in search_fields
		]

		base1, base2 = querysets
		conditions = []
		for search_term in search_terms:
			queries = [
				models.Q(**{orm_lookup: search_term})
				for orm_lookup in orm_lookups
			]
			conditions.append(reduce(operator.or_, queries))
			
		queryset1 = queryset1.filter(reduce(operator.and_, conditions))
		queryset2 = queryset2.filter(reduce(operator.and_, conditions))
		if self.must_call_distinct(queryset1, search_fields):
			queryset1 = distinct(queryset1, base1)
		if self.must_call_distinct(queryset2, search_fields):
			queryset2 = distinct(queryset2, base2)
		return QuerySetSequence(queryset1, queryset2)


class VideoExistsFilter(BaseFilterBackend):
	"""
	Filters by whether a Movie/Episode has a video file in storage.
	Accepts ?video_exists=1 (or true/yes) to show only entries with video,
	or ?video_exists=0 (false/no) for entries without.

	Strategy (Movie queryset):
	  1. Records with has_video already set are resolved via ORM — no S3 call.
	  2. Records where has_video is NULL (never checked) fall back to S3,
	     and the result is persisted so the next request is pure ORM.

	Strategy (Series queryset):
	  A series "has video" when at least one of its episodes has_video=True.
	  Episodes with has_video=NULL are checked against S3 and persisted too.
	"""
	param = 'video_exists'

	# ------------------------------------------------------------------ helpers

	def _episode_has_video(self, episode):
		from .models import Episode
		if episode.has_video is not None:
			return episode.has_video
		result = episode.video_path_exists()
		Episode.objects.filter(pk=episode.pk).update(has_video=result)
		return result

	def _series_has_video(self, series):
		for season in series.seasons.all():
			for episode in season.episodes.all():
				if self._episode_has_video(episode):
					return True
		return False

	# ------------------------------------------------------------------ entry point

	def filter_queryset(self, request, queryset, view):
		param = request.query_params.get(self.param)
		if param is None:
			return queryset
		want_exists = param.lower() in ('1', 'true', 'yes')
		if isinstance(queryset, QuerySetSequence):
			return self._filter_sequence(queryset, want_exists)
		return self._filter_regular(queryset, want_exists)

	# ------------------------------------------------------------------ sequence (MixFlixList)

	def _filter_sequence(self, queryset, want_exists):
		from .models import Movie, Series
		movie_pks = []
		series_pks = []
		for qs in queryset._querysets:
			if qs.model is Movie:
				movie_pks = self._movie_pks(qs, want_exists)
			elif qs.model is Series:
				series_pks = self._series_pks(qs, want_exists)
		# Always keep both sub-querysets so OrderingFilter and list() see a
		# consistent two-queryset structure regardless of match count.
		return QuerySetSequence(
			Movie.objects.filter(pk__in=movie_pks),
			Series.objects.filter(pk__in=series_pks),
		)

	# ------------------------------------------------------------------ regular (MovieList / SeriesList)

	def _filter_regular(self, queryset, want_exists):
		from .models import Movie, Series
		if queryset.model is Movie:
			pks = self._movie_pks(queryset, want_exists)
			return Movie.objects.filter(pk__in=pks)
		pks = self._series_pks(queryset, want_exists)
		return Series.objects.filter(pk__in=pks)

	# ------------------------------------------------------------------ per-model helpers

	def _movie_pks(self, queryset, want_exists):
		"""
		Return PKs of movies matching want_exists.
		ORM-resolved first; only NULL rows hit S3 (and are then persisted).
		"""
		from .models import Movie
		known = list(
			queryset.filter(has_video=want_exists).values_list('pk', flat=True)
		)
		extra = []
		for movie in queryset.filter(has_video__isnull=True):
			result = movie.video_path_exists()
			Movie.objects.filter(pk=movie.pk).update(has_video=result)
			if result == want_exists:
				extra.append(movie.pk)
		return known + extra

	def _series_pks(self, queryset, want_exists):
		"""
		Return PKs of series matching want_exists.
		Prefetches seasons/episodes to avoid per-series N+1 queries.
		"""
		pks = []
		for series in queryset.prefetch_related('seasons__episodes'):
			if self._series_has_video(series) == want_exists:
				pks.append(series.pk)
		return pks