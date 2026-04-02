from rest_framework.generics import CreateAPIView
from rest_framework.permissions import IsAuthenticated
from .serializers import UserMediaProgressSerializer


class UserMediaProgressView(CreateAPIView):
    serializer_class = UserMediaProgressSerializer
    permission_classes = [IsAuthenticated]
