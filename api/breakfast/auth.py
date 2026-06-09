"""Identity seam: pick-your-name in a signed cookie (signed with SECRET_KEY).
Swap current_user/set_user for OIDC/SSO later without touching any route."""
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
        return _signer.unsign(raw)
    except BadSignature:
        return None


def require_user(request) -> str:
    user = current_user(request)
    if user is None:
        raise HttpError(401, 'Not signed in')
    return user


def set_user(response, name: str) -> None:
    response.set_cookie(
        COOKIE, _signer.sign(name),
        max_age=THIRTY_DAYS, httponly=True, samesite='Strict', path='/',
    )


def clear_user(response) -> None:
    response.delete_cookie(COOKIE, path='/')
