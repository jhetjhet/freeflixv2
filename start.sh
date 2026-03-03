#!/bin/sh
set -e  # Exit immediately on error

python manage.py makemigrations flix feed client
python manage.py migrate --noinput

exec "$@" # Execute the command passed as arguments to the container