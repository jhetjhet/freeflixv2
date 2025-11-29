from django.shortcuts import(
	 Http404, 
	 get_object_or_404,
)
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