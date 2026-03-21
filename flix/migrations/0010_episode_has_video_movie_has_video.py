from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('flix', '0009_episode_extension_movie_extension'),
    ]

    operations = [
        migrations.AddField(
            model_name='episode',
            name='has_video',
            field=models.BooleanField(default=None, null=True),
        ),
        migrations.AddField(
            model_name='movie',
            name='has_video',
            field=models.BooleanField(default=None, null=True),
        ),
    ]
