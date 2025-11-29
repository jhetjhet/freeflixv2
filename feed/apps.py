from django.apps import AppConfig


class FeedConfig(AppConfig):
    name = 'feed'

    # def ready(self):
    # 	from .signals import (
    # 		comment_created_or_deleted,
    # 	)