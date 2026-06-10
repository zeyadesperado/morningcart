"""Django settings for MorningCart — a lean JSON API (Django Ninja) plus the
Django admin as the back office (users, restaurants, menus, sessions, orders)."""
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
if not DEBUG and ALLOWED_HOSTS == ['*']:
    import sys

    print(
        'WARNING: ALLOWED_HOSTS is "*" with DEBUG=false — fine on a trusted LAN, '
        'set ALLOWED_HOSTS explicitly for anything internet-facing.',
        file=sys.stderr,
    )
# Needed when the admin is used through an HTTPS tunnel/proxy origin,
# e.g. CSRF_TRUSTED_ORIGINS=https://breakfast.example.com
CSRF_TRUSTED_ORIGINS = [o for o in os.environ.get('CSRF_TRUSTED_ORIGINS', '').split(',') if o]
# Trust nginx's forwarded scheme so secure-cookie logic works behind HTTPS proxies.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Office-local time for the daily service date (YYYY-MM-DD).
OFFICE_TZ = os.environ.get('OFFICE_TZ', 'Africa/Cairo')
# Set true when serving over HTTPS so cookies are never sent in clear.
COOKIE_SECURE = os.environ.get('COOKIE_SECURE', 'false').lower() == 'true'
SESSION_COOKIE_SECURE = COOKIE_SECURE
CSRF_COOKIE_SECURE = COOKIE_SECURE

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'ninja',  # template discovery for /api/docs (Swagger UI)
    'breakfast',
]

# The API stays cookie-light: ninja views are csrf_exempt at the middleware
# level (CSRF for the mc_user cookie is mitigated by SameSite=Strict +
# same-origin serving — see breakfast/auth.py). The middleware below exists
# for the Django admin: real sessions, real CSRF, real auth.
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'morningcart.urls'
WSGI_APPLICATION = 'morningcart.wsgi.application'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        # project-level dir wins over app templates — admin branding lives here
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    }
]

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 10}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
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

# whitenoise serves the admin's static files straight from gunicorn —
# no nginx config or separate static host needed.
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage'},
}

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
