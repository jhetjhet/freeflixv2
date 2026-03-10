from django.contrib import admin

from .models import (
	Genre,
	Movie,
	Series,
	Season,
	Episode,
	MovieSubtitle,
	EpisodeSubtitle,
)


admin.site.register(Genre)
admin.site.register(Movie)
admin.site.register(Series)
admin.site.register(Season)
admin.site.register(Episode)
admin.site.register(MovieSubtitle)
admin.site.register(EpisodeSubtitle)
