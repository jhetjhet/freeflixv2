from django.db.models.signals import pre_delete, pre_save, post_save
from django.dispatch import receiver
from .models import Movie, Episode

from django.conf import settings
import os

@receiver(pre_save, sender=Movie)
def movie_signal_rem_old_vid_on_save(sender, instance, **kwargs):
	# old_movie = Movie.objects.filter(pk=instance.pk).first()
	# if old_movie:
	# 	if old_movie.video != instance.video:
	# 			old_movie.video.delete(save=False)
	# 	else:
	# 		vid_path = instance.video.path
	# 		head, tail = os.path.split(vid_path)
	# 		root, ext = os.path.splitext(tail)
	# 		if instance.title != root:
	# 			os.rename(instance.video.path, os.path.join(head, f'{instance.title}{ext}'))
	# 			old_name = instance.video.name
	# 			old_name_head, _ = os.path.split(old_name)
	# 			instance.video.name = os.path.join(old_name_head, f'{instance.title}{ext}')
	pass

@receiver(pre_delete, sender=Movie)
def movie_signal_rem_old_vid_on_del(sender, instance, **kwargs):
	# instance.video.delete(save=False)
	pass

@receiver(pre_save, sender=Episode)
def episode_signal_rem_old_vid_on_save(sender, instance, **kwargs):
	# old_eps = Episode.objects.filter(pk=instance.pk).first()
	# if old_eps:
	# 	if old_eps.video != instance.video:
	# 			old_eps.video.delete(save=False)
	# 	else:
	# 		vid_path = instance.video.path
	# 		head, tail = os.path.split(vid_path)
	# 		root, ext = os.path.splitext(tail)
	# 		if instance.title != root:
	# 			os.rename(instance.video.path, os.path.join(head, f'{instance.title}{ext}'))
	# 			old_name = instance.video.name
	# 			old_name_head, _ = os.path.split(old_name)
	# 			instance.video.name = os.path.join(old_name_head, f'{instance.title}{ext}')
	pass

@receiver(pre_delete, sender=Episode)
def episode_signal_rem_old_vid_on_del(sender, instance, **kwargs):
	# instance.video.delete(save=False)
	pass