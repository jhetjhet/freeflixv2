from django.db import models
from django.contrib.auth.models import AbstractUser

from uuid import uuid4

class Flixer(AbstractUser):
	id = models.UUIDField(primary_key=True, default=uuid4, editable=False)

	def __str__(self):
		return self.username