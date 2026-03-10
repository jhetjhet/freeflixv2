from django.contrib.auth.models import Group, Permission
from django.db.models.signals import post_migrate, post_save
from django.dispatch import receiver

from .models import Flixer


DEFAULT_FLIX_READER_GROUP = 'flix_readers'
FLIX_VIEW_PERMISSION_MODELS = (
    'genre',
    'movie',
    'series',
    'season',
    'episode',
    'moviesubtitle',
    'episodesubtitle',
)


def ensure_flix_reader_group():
    group, _ = Group.objects.get_or_create(name=DEFAULT_FLIX_READER_GROUP)
    permissions = Permission.objects.filter(
        content_type__app_label='flix',
        codename__in=[f'view_{model_name}' for model_name in FLIX_VIEW_PERMISSION_MODELS],
    )

    if permissions.exists():
        group.permissions.set(permissions)

    return group


@receiver(post_migrate)
def sync_flix_reader_group(sender, **kwargs):
    ensure_flix_reader_group()


@receiver(post_save, sender=Flixer)
def assign_default_flix_permissions(sender, instance, created, **kwargs):
    if not created:
        return

    group = ensure_flix_reader_group()
    instance.groups.add(group)