# from django.db.models.signals import post_save, post_delete
# from django.dispatch import receiver
# from .models import (
# 	MovieComment,
# 	SeriesComment,
# )
# from channels import layers
# from asgiref.sync import async_to_sync

# @receiver(post_delete, sender=MovieComment)
# @receiver(post_save, sender=MovieComment)
# def comment_created_or_deleted(sender, instance, **kwargs):
# 	print('x'*60)
# 	print(instance.flix.tmdb_id)
# 	print('x'*60)
# 	channel_layer = layers.get_channel_layer()
# 	async_to_sync(channel_layer.group_send)(
# 		instance.flix.tmdb_id,
# 		{
# 			'type': 'test_message',
# 			'data': 'HELLO THERE',
# 		}
# 	)