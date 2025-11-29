#!/bin/sh
set -e  # Exit immediately on error

echo "Starting DJANGO Server at $ENV_MODE..."

python manage.py makemigrations flix feed client
python manage.py migrate --noinput

if [ "$ENV_MODE" = "development" ]; then
    python manage.py runserver 0.0.0.0:8000
else
    gunicorn freeflix.wsgi:application -b 0.0.0.0:8000
fi