"""Idempotent superuser bootstrap from env — used by the Docker entrypoint so
the admin works out of the box: set ADMIN_USERNAME + ADMIN_PASSWORD and boot.

Safety: never clobbers an existing account (a password changed in the UI stays
changed across restarts) unless ADMIN_FORCE_PASSWORD=true, and weak passwords
fail the boot loudly instead of slipping past the validators."""
import os

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Create the admin superuser from ADMIN_USERNAME/ADMIN_PASSWORD env vars (create-only unless ADMIN_FORCE_PASSWORD=true).'

    def handle(self, *args, **options):
        username = os.environ.get('ADMIN_USERNAME', '').strip()
        password = os.environ.get('ADMIN_PASSWORD', '')
        force = os.environ.get('ADMIN_FORCE_PASSWORD', 'false').lower() == 'true'
        if not username or not password:
            self.stdout.write('ADMIN_USERNAME/ADMIN_PASSWORD not set — skipping admin bootstrap.')
            return

        User = get_user_model()
        user = User.objects.filter(username=username).first()
        if user and not force:
            self.stdout.write(
                f'Admin user "{username}" already exists — left untouched '
                '(set ADMIN_FORCE_PASSWORD=true to reset the password).'
            )
            return

        if user is None:
            user = User(username=username)
        try:
            validate_password(password, user)
        except ValidationError as e:
            raise CommandError(f'ADMIN_PASSWORD rejected: {" ".join(e.messages)}')
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save()
        self.stdout.write(self.style.SUCCESS(f'Admin user ready: {username}'))
