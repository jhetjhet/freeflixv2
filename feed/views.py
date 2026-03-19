from django.shortcuts import(
	 Http404, 
	 get_object_or_404,
	 render,
)
import requests as http_requests
from django.conf import settings
from rest_framework.generics import (
	RetrieveAPIView,
	CreateAPIView,
	UpdateAPIView,
	ListCreateAPIView,
	RetrieveUpdateDestroyAPIView,
)
from flix.models import (
	Movie,
	Series,
)
from .serializers import (
	MovieRatingSerializer,
	SeriesRatingSerializer,
	MovieCommentSerializer,
	SeriesCommentSerializer,
)
from queryset_sequence import QuerySetSequence

class RatingCreate(RetrieveAPIView, CreateAPIView, UpdateAPIView):

	def get_serializer_class(self):
		if 'flix_type' in self.kwargs:
			return MovieRatingSerializer if self.kwargs['flix_type'] == 'movie' else SeriesRatingSerializer
		raise Http404()

	def get_flix(self):
		kwargs = self.kwargs
		if 'flix_type' in kwargs and 'tmdb_id' in kwargs:
			flix = Movie if kwargs['flix_type'] == 'movie' else Series
			return get_object_or_404(flix, tmdb_id=kwargs['tmdb_id'])
		raise Http404()

	def get_object(self):
		queryset = self.get_queryset()
		return get_object_or_404(queryset, user=self.request.user)

	def get_queryset(self):
		flix = self.get_flix()
		return getattr(flix, '{}_ratings'.format(self.kwargs['flix_type'])).all()

	def perform_create(self, serializer):
		flix = self.get_flix()
		serializer.save(flix=flix, user=self.request.user)

class CommentList(ListCreateAPIView):

	def get_serializer_class(self):
		if 'flix_type' in self.kwargs:
			return MovieCommentSerializer if self.kwargs['flix_type'] == 'movie' else SeriesCommentSerializer
		raise Http404()

	def get_flix(self):
		kwargs = self.kwargs
		if 'flix_type' in kwargs and 'tmdb_id' in kwargs:
			flix = Movie if kwargs['flix_type'] == 'movie' else Series
			return get_object_or_404(flix, tmdb_id=kwargs['tmdb_id'])
		raise Http404()

	def get_queryset(self):
		flix = self.get_flix()
		return getattr(flix, '{}_comments'.format(self.kwargs['flix_type'])).all()

	def perform_create(self, serializer):
		if not self.request.user.is_authenticated:
			raise Http404()
		flix = self.get_flix()
		serializer.save(flix=flix, user=self.request.user)

class CommentDetail(RetrieveUpdateDestroyAPIView):

	def __init__(self, *args, **kwargs):
		super().__init__(*args, **kwargs)

	def get_serializer_class(self):
		if 'flix_type' in self.kwargs:
			return MovieCommentSerializer if self.kwargs['flix_type'] == 'movie' else SeriesCommentSerializer
		raise Http404()

	def get_object(self):
		if 'comment_id' in self.kwargs:
			querys = self.get_queryset()
			return get_object_or_404(querys, id=self.kwargs['comment_id'])
		raise Http404()

	def get_queryset(self):
		kwargs = self.kwargs
		if 'flix_type' in kwargs and 'tmdb_id' in kwargs:
			flix = Movie if kwargs['flix_type'] == 'movie' else Series
			flix = get_object_or_404(flix, tmdb_id=kwargs['tmdb_id'])
			return getattr(flix, '{}_comments'.format(self.kwargs['flix_type'])).all()
		raise Http404()


def watch_together_share(request, room_id):
    node_base_url = getattr(settings, 'NODE_BASE_URL', 'http://node_backend:8080')
    service_token = getattr(settings, 'NODE_SERVICE_TOKEN', '')
    tmdb_api_key = getattr(settings, 'TMDB_API_KEY', '')
    site_url = request.build_absolute_uri('/').rstrip('/')

    try:
        room_resp = http_requests.get(
            f'{node_base_url}/watch-together/internal/{room_id}/',
            headers={'x-service-token': service_token},
            timeout=5,
        )
        room_resp.raise_for_status()
        movie_id = room_resp.json()['movieId']
    except Exception:
        return render(request, 'feed/watch_together_share.html', {
            'title': 'Watch Together',
            'description': 'Join a Watch Together room.',
            'image': '',
            'redirect_url': f'/watch-together/{room_id}/',
            'site_url': f'{site_url}/share/watch-together/{room_id}/',
        })

    try:
        tmdb_resp = http_requests.get(
            f'https://api.themoviedb.org/3/movie/{movie_id}',
            params={'api_key': tmdb_api_key},
            timeout=5,
        )
        tmdb_resp.raise_for_status()
        tmdb = tmdb_resp.json()
    except Exception:
        tmdb = {}

    title = tmdb.get('title') or 'Watch Together'
    overview = tmdb.get('overview', '')[:200]
    backdrop = tmdb.get('backdrop_path')
    image = f'https://image.tmdb.org/t/p/w1280{backdrop}' if backdrop else ''

    return render(request, 'feed/watch_together_share.html', {
        'title': title,
        'description': overview or 'Join a Watch Together room on FreeFlix.',
        'image': image,
        'redirect_url': f'/watch-together/{room_id}/',
        'site_url': f'{site_url}/share/watch-together/{room_id}/',
    })