"""Identity seam: pick-your-name in a signed cookie (signed with SECRET_KEY).
Swap current_user/set_user for OIDC/SSO later without touching any route."""
from urllib.parse import quote, unquote

from django.conf import settings
from django.core.signing import BadSignature, Signer
from ninja.errors import HttpError

COOKIE = 'mc_user'
THIRTY_DAYS = 60 * 60 * 24 * 30
_signer = Signer()


def current_user(request):
    raw = request.COOKIES.get(COOKIE)
    if not raw:
        return None
    try:
        return unquote(_signer.unsign(raw))
    except BadSignature:
        return None


def require_user(request) -> str:
    user = current_user(request)
    if user is None:
        raise HttpError(401, 'Not signed in')
    return user


def set_user(response, name: str) -> None:
    # percent-encode: Set-Cookie headers are latin-1, names can be Arabic
    response.set_cookie(
        COOKIE, _signer.sign(quote(name)),
        max_age=THIRTY_DAYS, httponly=True, samesite='Strict', path='/',
        secure=getattr(settings, 'COOKIE_SECURE', False),
    )


def clear_user(response) -> None:
    response.delete_cookie(COOKIE, path='/')
