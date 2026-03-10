from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Permission

from .models import Flixer


@admin.register(Flixer)
class FlixerAdmin(UserAdmin):
	model = Flixer
	list_display = ('username', 'email', 'is_staff', 'is_active')
	filter_horizontal = ('groups', 'user_permissions')

	def formfield_for_manytomany(self, db_field, request, **kwargs):
		if db_field.name == 'user_permissions':
			kwargs['queryset'] = Permission.objects.filter(
				content_type__app_label__in=('client', 'flix')
			).order_by('content_type__app_label', 'codename')
		return super().formfield_for_manytomany(db_field, request, **kwargs)
