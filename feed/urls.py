from django.urls import re_path
from .views import (
	RatingCreate,
	CommentList,
	CommentDetail,
)

urlpatterns = [
	re_path(r'^(?P<flix_type>(movie|series))/(?P<tmdb_id>\d+)/rate/$', RatingCreate.as_view()),
	re_path(r'^(?P<flix_type>(movie|series))/(?P<tmdb_id>\d+)/comment/$', CommentList.as_view()),
	re_path(r'^(?P<flix_type>(movie|series))/(?P<tmdb_id>\d+)/comment/(?P<comment_id>\d+)/$', CommentDetail.as_view()),
]