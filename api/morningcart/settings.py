"""Django settings for MorningCart — a lean JSON API (Django Ninja), no admin/auth/sessions."""
import os
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

BASE_DIR = Path(__file__).resolve().parent.parent

# Identity cookies are signed with SECRET_KEY. Reuse COOKIE_SECRET so it matches
# the documented env var; fail-soft to a dev default only when DEBUG.
SECRET_KEY = os.environ.get('COOKIE_SECRET') or os.environ.get('DJANGO_SECRET_KEY') or 'dev-only-insecure-secret-change-me-0123456789abcdef'
DEBUG = os.environ.get('DEBUG', 'true').lower() == 'true'
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '*').split(',')

# Office-local time for the daily service date (YYYY-MM-DD).
OFFICE_TZ = os.environ.get('OFFICE_TZ', 'Africa/Cairo')
# The web origin (for any future CORS need; same-origin via proxy/nginx by default).
WEB_ORIGIN = os.environ.get('WEB_ORIGIN', 'http://localhost:5173')

INSTALLED_APPS = ['breakfast']

# Minimal: no sessions/auth/CSRF middleware — identity is a custom signed cookie,
# CSRF is mitigated by SameSite=Strict + same-origin serving (see breakfast/auth.py).
MIDDLEWARE = []

ROOT_URLCONF = 'morningcart.urls'
WSGI_APPLICATION = 'morningcart.wsgi.application'
TEMPLATES = []


def _database_from_url(url: str) -> dict:
    """Parse a postgres URL (incl. unix-socket form ?host=/var/run/postgresql)."""
    u = urlparse(url)
    q = parse_qs(u.query)
    host = q['host'][0] if 'host' in q else (u.hostname or '')
    return {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': u.path.lstrip('/') or 'morningcart',
        'USER': unquote(u.username or ''),
        'PASSWORD': unquote(u.password or ''),
        'HOST': host,
        'PORT': str(u.port or ''),
        'CONN_MAX_AGE': 60,
    }


DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://morningcart:morningcart@localhost:5432/morningcart')
DATABASES = {'default': _database_from_url(DATABASE_URL)}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
USE_TZ = True
TIME_ZONE = 'UTC'
USE_I18N = False

# We don't serve Django static; nginx serves the web build.
STATIC_URL = 'static/'
