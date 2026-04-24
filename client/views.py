from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .serializers import CustomTokenObtainPairSerializer, CustomTokenRefreshSerializer, FlixerPublicSerializer
from .models import Flixer


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class CustomTokenRefreshView(TokenRefreshView):
    serializer_class = CustomTokenRefreshSerializer


class UserPublicView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ids = request.query_params.getlist('ids')
        if not ids:
            return Response([])
        users = Flixer.objects.filter(id__in=ids)
        serializer = FlixerPublicSerializer(users, many=True)
        return Response(serializer.data)
