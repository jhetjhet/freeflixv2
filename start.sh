#!/bin/sh
set -e  # Exit immediately on error

python manage.py makemigrations flix feed client progress
python manage.py migrate --noinput
python manage.py collectstatic --noinput

exec "$@" # Execute the command passed as arguments to the container