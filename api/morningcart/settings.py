"""Django settings for MorningCart — a lean JSON API (Django Ninja), no admin/auth/sessions."""
import os
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

DEBUG = os.environ.get('DEBUG', 'true').lower() == 'true'

# Identity cookies are signed with SECRET_KEY. Reuse COOKIE_SECRET so it matches
# the documented env var; the insecure dev fallback is allowed ONLY when DEBUG.
SECRET_KEY = os.environ.get('COOKIE_SECRET') or os.environ.get('DJANGO_SECRET_KEY') or ''
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = 'dev-only-insecure-secret-change-me-0123456789abcdef'
    else:
        raise ImproperlyConfigured(
            'COOKIE_SECRET is required when DEBUG=false — identity cookies would be '
            'forgeable with a public default. Generate one: openssl rand -hex 32'
        )

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '*').split(',')

# Office-local time for the daily service date (YYYY-MM-DD).
OFFICE_TZ = os.environ.get('OFFICE_TZ', 'Africa/Cairo')
# Set true when serving over HTTPS so the identity cookie is never sent in clear.
COOKIE_SECURE = os.environ.get('COOKIE_SECURE', 'false').lower() == 'true'

# 'ninja' is installed only so APP_DIRS template loading finds the Swagger UI
# templates for /api/docs.
INSTALLED_APPS = ['ninja', 'breakfast']

# Minimal: no sessions/auth/CSRF middleware — identity is a custom signed cookie,
# CSRF is mitigated by SameSite=Strict + same-origin serving (see breakfast/auth.py).
MIDDLEWARE = []

ROOT_URLCONF = 'morningcart.urls'
WSGI_APPLICATION = 'morningcart.wsgi.application'

# Required for the interactive /api/docs page (django-ninja renders a template).
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {},
    }
]


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

# Errors must be visible with DEBUG=false too (Django's default console handler
# is gated on require_debug_true, which leaves production 500s traceless).
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {'console': {'class': 'logging.StreamHandler'}},
    'root': {'handlers': ['console'], 'level': 'WARNING'},
    'loggers': {
        'django.request': {'handlers': ['console'], 'level': 'ERROR', 'propagate': False},
        'breakfast': {'handlers': ['console'], 'level': 'INFO', 'propagate': False},
    },
}
