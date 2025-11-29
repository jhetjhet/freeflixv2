from django.conf import settings

import os
import re
import mimetypes
from wsgiref.util import FileWrapper

from django.http.response import StreamingHttpResponse, HttpResponse

range_re = re.compile(r'bytes\s*=\s*(\d+)\s*-\s*(\d*)', re.I)

# class RangeFileWrapper(object):
#     def __init__(self, filelike, blksize=8192, offset=0, length=None):
#         self.filelike = filelike
#         self.filelike.seek(offset, os.SEEK_SET)
#         self.remaining = length
#         self.blksize = blksize

#     def close(self):
#         if hasattr(self.filelike, 'close'):
#             self.filelike.close()

#     def __iter__(self):
#         return self

#     def __next__(self):
#         if self.remaining is None:
#             # If remaining is None, we're reading the entire file.
#             data = self.filelike.read(self.blksize)
#             if data:
#                 return data
#             raise StopIteration()
#         else:
#             if self.remaining <= 0:
#                 raise StopIteration()
#             data = self.filelike.read(min(self.remaining, self.blksize))
#             if not data:
#                 raise StopIteration()
#             self.remaining -= len(data)
#             return data

# def stream_video(request):
#     path = settings.BASE_DIR + request.path
#     range_header = request.META.get('HTTP_RANGE', '').strip()
#     range_match = range_re.match(range_header)
#     size = os.path.getsize(path)
#     content_type, encoding = mimetypes.guess_type(path)
#     content_type = content_type or 'application/octet-stream'
#     if range_match:
#         first_byte, last_byte = range_match.groups()
#         first_byte = int(first_byte) if first_byte else 0
#         last_byte = int(last_byte) if last_byte else size - 1
#         if last_byte >= size:
#             last_byte = size - 1
#         length = last_byte - first_byte + 1
#         resp = StreamingHttpResponse(RangeFileWrapper(open(path, 'rb'), offset=first_byte, length=length), status=206, content_type=content_type)
#         resp['Content-Length'] = str(length)
#         resp['Content-Range'] = 'bytes %s-%s/%s' % (first_byte, last_byte, size)
#     else:
#         resp = StreamingHttpResponse(FileWrapper(open(path, 'rb')), content_type=content_type)
#         resp['Content-Length'] = str(size)
#     resp['Accept-Ranges'] = 'bytes'
#     return resp

# from ranged_fileresponse import RangedFileResponse

def stream_video(request):
    path = settings.BASE_DIR + request.path
    content_type, encoding = mimetypes.guess_type(path)
    content_type = content_type or 'application/octet-stream'
    resp = RangedFileResponse(request, open(path, 'rb'), content_type=content_type)
    resp['Content-Disposition'] = f'attachment; filename="{path}"'
    return resp

from django.shortcuts import get_object_or_404, Http404
from rest_framework.generics import (
    ListCreateAPIView, 
    RetrieveUpdateDestroyAPIView,
    ListAPIView,
)
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
)
from rest_framework.filters import (
    SearchFilter,
    OrderingFilter,
)
from .filter import SequenceSearchFilter
from queryset_sequence import QuerySetSequence
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

class GenreList(ListAPIView):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer
    pagination_class = None

class MovieSubtitleList(ListCreateAPIView):
    serializer_class = MovieSubtitleSerializer
    pagination_class = None


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

    def get_queryset(self):
        movie = get_object_or_404(Movie, tmdb_id=self.kwargs.get('tmdb_id'))
        return MovieSubtitle.objects.filter(movie=movie)

class EpisodeSubtitleList(ListCreateAPIView):
    serializer_class = EpisodeSubtitleSerializer
    pagination_class = None

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

    def get_queryset(self):
        series = get_object_or_404(Series, tmdb_id=self.kwargs.get('series_tmdb_id'))
        season = get_object_or_404(Season, series=series, season_number=self.kwargs.get('season_number'))
        episode = get_object_or_404(Episode, season=season, episode_number=self.kwargs.get('episode_number'))
        return EpisodeSubtitle.objects.filter(episode=episode)

class MixFlixList(ListAPIView):
    filter_backends = [
        SequenceSearchFilter,
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
        querys = self.get_queryset()
        datas = []
        for query in querys:
            if query.__class__ == Movie:
                datas.append(MovieSerializer(query).data)
            elif query.__class__ == Series:
                datas.append(SeriesSerializer(query).data)
        return self.get_paginated_response(datas)

    def get_queryset(self):
        params = self.request.query_params
        if 'genre' in params:
            genre_name = params['genre']
            genre = Genre.objects.filter(name__iexact=genre_name)
            if genre.exists():
                genre = genre.first()
                movie_qrys = genre.movie_set.all()
                series_qrys = genre.series_set.all()
        else:
            movie_qrys = Movie.objects.all()
            series_qrys = Series.objects.all()
        queryset = self.filter_queryset((movie_qrys, series_qrys))
        return self.paginate_queryset(queryset)

class MovieList(ListCreateAPIView):
    serializer_class = MovieSerializer
    filter_backends = [
        SearchFilter,
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

class SeriesList(ListCreateAPIView):
    queryset = Series.objects.all()
    serializer_class = SeriesSerializer
    filter_backends = [
        SearchFilter,
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


class SeriesDetail(RetrieveUpdateDestroyAPIView):
    queryset = Series.objects.all()
    serializer_class = SeriesSerializer
    lookup_fields = ['series_tmdb_id']

    def get_object(self):
        queryset = self.get_queryset()
        if 'series_tmdb_id' in self.kwargs:
            obj = get_object_or_404(queryset, tmdb_id=self.kwargs['series_tmdb_id'])
            return obj
        raise Http404()

class SeasonList(ListCreateAPIView):
    queryset = Season.objects.all()
    serializer_class = SeasonSerializer
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