from django.urls import path, re_path, include
from rest_framework.routers import DefaultRouter

from .views import (
	EpisodeSubtitleDetail,
	EpisodeSubtitleList,
	GenreList,
	MixFlixList,
	MovieList, 
	MovieDetail,
	MovieSubtitleDetail,
	MovieSubtitleList,
	SeriesList,
	SeriesDetail,
	SeasonList,
	SeasonDetail,
	EpisodeList,
	EpisodeDetail,
)

urlpatterns = [
	path('genre/list/', GenreList.as_view()),

	path('all/', MixFlixList.as_view()),

	path('movie/', MovieList.as_view()),
	path('movie/<tmdb_id>/', MovieDetail.as_view()),
	path('movie/<tmdb_id>/subtitles/', MovieSubtitleList.as_view()),
	path('movie/<tmdb_id>/subtitles/<subtitle_id>/', MovieSubtitleDetail.as_view()),

	path('series/', SeriesList.as_view()),
	path('series/<series_tmdb_id>/', SeriesDetail.as_view()),
	path('series/<series_tmdb_id>/season/', SeasonList.as_view()),
	path('series/<series_tmdb_id>/season/<season_number>/', SeasonDetail.as_view()),
	path('series/<series_tmdb_id>/season/<season_number>/episode/', EpisodeList.as_view()),
	path('series/<series_tmdb_id>/season/<season_number>/episode/<episode_number>/', EpisodeDetail.as_view()),
	path('series/<series_tmdb_id>/season/<season_number>/episode/<episode_number>/subtitles/', EpisodeSubtitleList.as_view()),
	path('series/<series_tmdb_id>/season/<season_number>/episode/<episode_number>/subtitles/<subtitle_id>/', EpisodeSubtitleDetail.as_view()),
]