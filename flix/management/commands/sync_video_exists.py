from django.core.management.base import BaseCommand
from django.core.files.storage import default_storage
from flix.models import Movie, Episode


class Command(BaseCommand):
    help = (
        'Backfills has_video for Movie and Episode rows where it is NULL. '
        'Run once after deploying the 0010 migration. Safe to re-run: '
        'only checks records that are still NULL.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Re-check ALL records, not just NULL ones.',
        )

    def handle(self, *args, **options):
        force = options['force']

        movie_qs = Movie.objects.all() if force else Movie.objects.filter(has_video__isnull=True)
        episode_qs = Episode.objects.all() if force else Episode.objects.filter(has_video__isnull=True)

        self._sync(movie_qs, 'Movie')
        self._sync(episode_qs, 'Episode')

    def _sync(self, queryset, label):
        total = queryset.count()
        if total == 0:
            self.stdout.write(f'{label}: nothing to update.')
            return

        updated_true = 0
        updated_false = 0

        for obj in queryset.iterator():
            result = default_storage.exists(obj.video_path())
            type(obj).objects.filter(pk=obj.pk).update(has_video=result)
            if result:
                updated_true += 1
            else:
                updated_false += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'{label}: {total} checked — {updated_true} have video, {updated_false} do not.'
            )
        )
