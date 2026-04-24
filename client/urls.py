from django.urls import path, include, re_path
from .views import CustomTokenObtainPairView, CustomTokenRefreshView, UserPublicView

urlpatterns = [
	path('users/lookup/', UserPublicView.as_view(), name='user-lookup'),
	path('', include('djoser.urls')),
	# Override djoser JWT create/refresh with custom serializers that expose expiration
	re_path(r'^jwt/create/?', CustomTokenObtainPairView.as_view(), name='jwt-create'),
	re_path(r'^jwt/refresh/?', CustomTokenRefreshView.as_view(), name='jwt-refresh'),
	path('', include('djoser.urls.jwt')),
]