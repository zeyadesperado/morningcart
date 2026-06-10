#!/usr/bin/env sh
set -e

python manage.py migrate --noinput
python manage.py collectstatic --noinput

if [ "${SEED_ON_BOOT:-false}" = "true" ]; then
  python manage.py seed
fi

# Optional admin bootstrap: set ADMIN_USERNAME + ADMIN_PASSWORD (idempotent no-op otherwise)
python manage.py ensure_admin

exec gunicorn morningcart.wsgi:application --bind "0.0.0.0:${PORT:-4000}" --workers 3 --access-logfile -
