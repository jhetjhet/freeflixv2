from django.conf import settings
from django.shortcuts import get_object_or_404, Http404
from django.contrib.contenttypes.models import ContentType
from rest_framework.generics import (
    ListCreateAPIView, 
    RetrieveUpdateDestroyAPIView,
    ListAPIView,
)
from rest_framework.permissions import IsAuthenticated
from .models import (
    EpisodeSubtitle,
    Genre,
    Movie,
    Episode,
    MovieSubtitle,
    Season,
    Series,
)
from .serializers import (
    EpisodeSubtitleSerializer,
    GenreSerializer,
    MovieSerializer,
    EpisodeSerializer,
    MovieSubtitleSerializer,
    SeasonSerializer,
    SeriesSerializer,
    RecentlyWatchedSeriesSerializer,
)
from rest_framework.filters import (
    SearchFilter,
    OrderingFilter,
)
from .filter import SequenceSearchFilter, VideoExistsFilter
from .permissions import FlixModelPermission, NodeServicePermission
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from progress.models import UserMediaProgress

class GenreList(ListAPIView):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer
    pagination_class = None
    permission_classes = [FlixModelPermission]
    permission_model = Genre

class MovieSubtitleList(ListCreateAPIView):
    serializer_class = MovieSubtitleSerializer
    pagination_class = None
    permission_classes = [FlixModelPermission]
    permission_model = MovieSubtitle


    def perform_create(self, serializer):
        movie = get_object_or_404(Movie, tmdb_id=self.kwargs.get('tmdb_id'))

        serializer.save(movie_id=movie.id)

    def get_queryset(self):
        movie = get_object_or_404(Movie, tmdb_id=self.kwargs.get('tmdb_id'))
        return MovieSubtitle.objects.filter(movie=movie)

class MovieSubtitleDetail(RetrieveUpdateDestroyAPIView):
    serializer_class = MovieSubtitleSerializer
    lookup_field = 'id'
    lookup_url_kwarg = 'subtitle_id'
    permission_classes = [FlixModelPermission]
    permission_model = MovieSubtitle

    def get_queryset(self):
        movie = get_object_or_404(Movie, tmdb_id=self.kwargs.get('tmdb_id'))
        return MovieSubtitle.objects.filter(movie=movie)

class EpisodeSubtitleList(ListCreateAPIView):
    serializer_class = EpisodeSubtitleSerializer
    pagination_class = None
    permission_classes = [FlixModelPermission]
    permission_model = EpisodeSubtitle

    def perform_create(self, serializer):
        series = get_object_or_404(Series, tmdb_id=self.kwargs.get('series_tmdb_id'))
        season = get_object_or_404(Season, series=series, season_number=self.kwargs.get('season_number'))
        episode = get_object_or_404(Episode, season=season, episode_number=self.kwargs.get('episode_number'))

        serializer.save(episode_id=episode.id)

    def get_queryset(self):
        series = get_object_or_404(Series, tmdb_id=self.kwargs.get('series_tmdb_id'))
        season = get_object_or_404(Season, series=series, season_number=self.kwargs.get('season_number'))
        episode = get_object_or_404(Episode, season=season, episode_number=self.kwargs.get('episode_number'))
        return EpisodeSubtitle.objects.filter(episode=episode)

class EpisodeSubtitleDetail(RetrieveUpdateDestroyAPIView):
    serializer_class = EpisodeSubtitleSerializer
    lookup_field = 'id'
    lookup_url_kwarg = 'subtitle_id'
    permission_classes = [FlixModelPermission]
    permission_model = EpisodeSubtitle

    def get_queryset(self):
        series = get_object_or_404(Series, tmdb_id=self.kwargs.get('series_tmdb_id'))
        season = get_object_or_404(Season, series=series, season_number=self.kwargs.get('season_number'))
        episode = get_object_or_404(Episode, season=season, episode_number=self.kwargs.get('episode_number'))
        return EpisodeSubtitle.objects.filter(episode=episode)

class MixFlixList(ListAPIView):
    permission_classes = [FlixModelPermission]
    permission_models = [Movie, Series]
    filter_backends = [
        SequenceSearchFilter,
        VideoExistsFilter,
        OrderingFilter,
    ]
    search_fields = [
        'title',
        'date_release',
    ]
    ordering_fields = [
        'title',
        'date_release',
        'date_upload',
    ]
    ordering = ['date_upload']

    def list(self, request):
        queryset = self.get_queryset()

        page = self.paginate_queryset(queryset)

        datas = []
        
        for query in page:
            if isinstance(query, Movie):
                datas.append(MovieSerializer(query).data)
            elif isinstance(query, Series):
                datas.append(SeriesSerializer(query).data)

        return self.get_paginated_response(datas)

    def get_queryset(self):
        params = self.request.query_params
        if 'genre' in params:
            genre_name = params['genre']
            
            movie_qrys = Movie.objects.filter(genres__name__icontains=genre_name)
            series_qrys = Series.objects.filter(genres__name__icontains=genre_name)
        else:
            movie_qrys = Movie.objects.all()
            series_qrys = Series.objects.all()

        queryset = self.filter_queryset((movie_qrys, series_qrys))
        return queryset


class RecentlyWatchedBaseList(ListAPIView):
    """Base utilities for recently watched endpoints powered by UserMediaProgress."""

    permission_classes = [IsAuthenticated, FlixModelPermission]

    def is_finished_only(self):
        raw = str(self.request.query_params.get('is_finished', 'false')).strip().lower()
        return raw not in ('0', 'false', 'no')

    def progress_queryset(self, model):
        content_type = ContentType.objects.get_for_model(model)
        queryset = UserMediaProgress.objects.filter(
            user=self.request.user,
            content_type=content_type,
        )
        if self.is_finished_only():
            queryset = queryset.filter(is_finished=True)
        return queryset.order_by('-last_watched_at')

    def ordered_movies_from_progress(self):
        progress = list(self.progress_queryset(Movie))
        object_ids = [p.object_id for p in progress]
        if not object_ids:
            return []

        movies = Movie.objects.filter(pk__in=object_ids)
        movie_map = {str(movie.pk): movie for movie in movies}

        ordered = []
        seen = set()
        for object_id in object_ids:
            if object_id in seen:
                continue
            movie = movie_map.get(object_id)
            if movie is not None:
                ordered.append(movie)
                seen.add(object_id)
        return ordered

    def ordered_series_from_progress(self):
        return [item['series'] for item in self._series_with_progress()]


class RecentlyWatchedMovieList(RecentlyWatchedBaseList):
    serializer_class = MovieSerializer
    permission_model = Movie

    def get_queryset(self):
        return self.ordered_movies_from_progress()


class RecentlyWatchedSeriesList(RecentlyWatchedBaseList):
    serializer_class = RecentlyWatchedSeriesSerializer
    permission_model = Series

    def get_queryset(self):
        items = self._series_with_progress()
        for item in items:
            item['series']._recent_episode = item['episode']
            item['series']._recent_progress = item['progress']
        return [item['series'] for item in items]


class RecentlyWatchedAllList(RecentlyWatchedBaseList):
    permission_models = [Movie, Series]

    def list(self, request):
        movie_progress = [
            {'obj': movie, 'watched_at': progress.last_watched_at}
            for movie, progress in self._movies_with_progress()
        ]
        series_items = self._series_with_progress()
        for item in series_items:
            item['series']._recent_episode = item['episode']
            item['series']._recent_progress = item['progress']

        series_progress = [
            {'obj': item['series'], 'watched_at': item['watched_at']}
            for item in series_items
        ]

        combined = movie_progress + series_progress
        combined.sort(key=lambda item: item['watched_at'], reverse=True)

        page = self.paginate_queryset(combined)
        datas = []
        for item in page:
            obj = item['obj']
            if isinstance(obj, Movie):
                datas.append(MovieSerializer(obj, context=self.get_serializer_context()).data)
            elif isinstance(obj, Series):
                datas.append(RecentlyWatchedSeriesSerializer(obj, context=self.get_serializer_context()).data)

        return self.get_paginated_response(datas)

    def _movies_with_progress(self):
        progress = list(self.progress_queryset(Movie))
        object_ids = [p.object_id for p in progress]
        if not object_ids:
            return []

        movies = Movie.objects.filter(pk__in=object_ids)
        movie_map = {str(movie.pk): movie for movie in movies}

        result = []
        seen = set()
        for item in progress:
            if item.object_id in seen:
                continue
            movie = movie_map.get(item.object_id)
            if movie is not None:
                result.append((movie, item))
                seen.add(item.object_id)
        return result

    def _series_with_progress(self):
        progress = list(self.progress_queryset(Episode))
        episode_ids = []
        for item in progress:
            try:
                episode_ids.append(int(item.object_id))
            except (TypeError, ValueError):
                continue

        if not episode_ids:
            return []

        episodes = Episode.objects.filter(pk__in=episode_ids).select_related('season__series')
        episode_map = {str(episode.pk): episode for episode in episodes}

        result = []
        seen_series = set()
        for item in progress:
            episode = episode_map.get(item.object_id)
            if episode is None:
                continue
            series = episode.season.series
            series_key = str(series.pk)
            if series_key in seen_series:
                continue
            seen_series.add(series_key)
            result.append({
                'series': series,
                'episode': episode,
                'progress': item,
                'watched_at': item.last_watched_at,
            })
        return result

class MovieList(ListCreateAPIView):
    serializer_class = MovieSerializer
    permission_classes = [FlixModelPermission]
    permission_model = Movie
    filter_backends = [
        SearchFilter,
        VideoExistsFilter,
        OrderingFilter,
    ]
    search_fields = [
        'title',
        'date_release',
    ]
    ordering_fields = [
        'title',
        'date_release',
        'date_upload',
    ]
    ordering = ['date_upload']

    def get_queryset(self):
        params = self.request.query_params
        if 'genre' in params:
            genre_name = params['genre']
            genre = Genre.objects.filter(name__iexact=genre_name)
            if genre.exists():
                return genre.first().movie_set.all()
        return Movie.objects.all()

class MovieDetail(RetrieveUpdateDestroyAPIView):
    queryset = Movie.objects.all()
    serializer_class = MovieSerializer
    lookup_field = 'tmdb_id'
    permission_classes = [NodeServicePermission | FlixModelPermission]
    permission_model = Movie

class SeriesList(ListCreateAPIView):
    queryset = Series.objects.all()
    serializer_class = SeriesSerializer
    permission_classes = [FlixModelPermission]
    permission_model = Series
    filter_backends = [
        SearchFilter,
        VideoExistsFilter,
        OrderingFilter,
    ]
    search_fields = [
        'title',
        'date_release',
    ]
    ordering_fields = [
        'title',
        'date_release',
        'date_upload',
    ]
    ordering = ['date_upload']

    def create(self, request, *args, **kwargs):
        filtered_genres = request.data.get('genres', [])
        existing_genres = []

        for genre in filtered_genres:
            if not isinstance(genre, dict):
                raise ValidationError("Genres must be a list of dictionaries with 'tmdb_id' and 'name' keys.")
            
            if Genre.objects.filter(tmdb_id=genre.get('tmdb_id')).exists():
                existing_genres.append(genre['tmdb_id'])
                del genre['tmdb_id']

        request.data['genres'] = filtered_genres

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()

        for genre in existing_genres:
            genre_obj = Genre.objects.get(tmdb_id=genre)
            instance.genres.add(genre_obj)
        
        if existing_genres:
            instance.save()

        return Response(serializer.data)

    def get_queryset(self):
        params = self.request.query_params
        if 'genre' in params:
            genre_name = params['genre']
            genre = Genre.objects.filter(name__iexact=genre_name)
            if genre.exists():
                return genre.first().series_set.all()
        return Series.objects.all()


class SeriesDetail(RetrieveUpdateDestroyAPIView):
    queryset = Series.objects.all()
    serializer_class = SeriesSerializer
    lookup_fields = ['series_tmdb_id']
    permission_classes = [FlixModelPermission]
    permission_model = Series

    def get_object(self):
        queryset = self.get_queryset()
        if 'series_tmdb_id' in self.kwargs:
            obj = get_object_or_404(queryset, tmdb_id=self.kwargs['series_tmdb_id'])
            return obj
        raise Http404()

class SeasonList(ListCreateAPIView):
    queryset = Season.objects.all()
    serializer_class = SeasonSerializer
    permission_classes = [FlixModelPermission]
    permission_model = Season
    lookup_fields = [
        'series_tmdb_id',
    ]

    def get_season(self):
        if 'series_tmdb_id' in self.kwargs:
            return get_object_or_404(Series, tmdb_id=self.kwargs['series_tmdb_id'])
        raise Http404()

    def get_queryset(self):
        series = self.get_season()
        return series.seasons.all()

    def perform_create(self, serializer):
        series = self.get_season()
        serializer.save(series=series)

class SeasonDetail(RetrieveUpdateDestroyAPIView):
    serializer_class = SeasonSerializer
    permission_classes = [FlixModelPermission]
    permission_model = Season
    lookup_fields = [
        'series_tmdb_id',
        'season_number',
    ]

    def get_queryset(self):
        if not 'series_tmdb_id' in self.kwargs:
            raise Http404()
        series = get_object_or_404(Series, tmdb_id=self.kwargs['series_tmdb_id'])
        self.series = series
        return series.seasons.all()

    def get_object(self):
        queryset = self.get_queryset()
        if not 'season_number' in self.kwargs:
            raise Http404()
        season = get_object_or_404(queryset, season_number=self.kwargs['season_number'])
        return season

class EpisodeList(ListCreateAPIView):
    queryset = Episode.objects.all()
    serializer_class = EpisodeSerializer
    permission_classes = [FlixModelPermission]
    permission_model = Episode
    lookup_fields = [
        'series_tmdb_id',
        'season_number',
    ]

    def get_season(self):
        if 'series_tmdb_id' in self.kwargs and 'season_number' in self.kwargs:
            series = get_object_or_404(Series, tmdb_id=self.kwargs['series_tmdb_id'])
            return get_object_or_404(series.seasons.all(), season_number=self.kwargs['season_number'])
        raise Http404()

    def get_queryset(self):
        season = self.get_season()
        return season.episodes.all()

    def perform_create(self, serializer):
        season = self.get_season()
        serializer.save(season=season)

class EpisodeDetail(RetrieveUpdateDestroyAPIView):
    queryset = Episode.objects.all()
    serializer_class = EpisodeSerializer
    permission_classes = [NodeServicePermission | FlixModelPermission]
    permission_model = Episode
    lookup_fields = [
        'series_tmdb_id',
        'season_number',
        'episode_number',
    ]

    def get_queryset(self):
        if not ('series_tmdb_id' in self.kwargs and 'season_number' in self.kwargs):
            raise Http404()
        series = get_object_or_404(Series, tmdb_id=self.kwargs['series_tmdb_id'])
        season = series.seasons.get(season_number=self.kwargs['season_number'])
        return season.episodes.all()

    def get_object(self):
        queryset = self.get_queryset()
        if not 'episode_number' in self.kwargs:
            raise Http404()
        episode = get_object_or_404(queryset, episode_number=self.kwargs['episode_number'])
        return episode