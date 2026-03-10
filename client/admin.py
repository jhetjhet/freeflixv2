from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Flixer


@admin.register(Flixer)
class FlixerAdmin(UserAdmin):
	model = Flixer
