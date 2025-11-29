from django.apps import AppConfig


class FlixConfig(AppConfig):
    name = 'flix'

    def ready(self):
    	from .signals import (
    		movie_signal_rem_old_vid_on_save,
    		movie_signal_rem_old_vid_on_del,
    		episode_signal_rem_old_vid_on_save,
    		episode_signal_rem_old_vid_on_del,
    	)