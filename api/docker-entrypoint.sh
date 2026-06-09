#!/usr/bin/env sh
set -e

python manage.py migrate --noinput

if [ "${SEED_ON_BOOT:-false}" = "true" ]; then
  python manage.py seed
fi

exec gunicorn morningcart.wsgi:application --bind "0.0.0.0:${PORT:-4000}" --workers 3
