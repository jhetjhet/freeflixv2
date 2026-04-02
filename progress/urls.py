from django.urls import path
from .views import UserMediaProgressView

urlpatterns = [
    path('progress/', UserMediaProgressView.as_view(), name='user-media-progress'),
]
