from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('client', '0001_initial'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='flixer',
            options={
                'permissions': [('p2p_stream', 'Can stream via P2P')],
            },
        ),
    ]
