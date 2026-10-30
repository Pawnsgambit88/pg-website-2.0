import uuid

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.db import models
from django.db.models.functions import Lower


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password, name, **extra):
        email = self.normalize_email(email).strip().lower()
        user = self.model(email=email, name=name, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user


class User(AbstractBaseUser):
    """Account. The role lives only here (no client write path) and is always read from the database."""

    ROLE_CHOICES = [('player', 'Player'), ('admin', 'Admin')]
    STATUS_CHOICES = [('active', 'Active'), ('suspended', 'Suspended')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(max_length=254, unique=True)  # always stored lowercased (see constraint)
    name = models.CharField(max_length=80)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='player')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')

    # Private profile (M13/M14)
    city = models.CharField(max_length=80, null=True, blank=True)
    area = models.CharField(max_length=80, null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    birthday = models.DateField(null=True, blank=True)
    chess_com_handle = models.CharField(max_length=25, null=True, blank=True)
    fide_id = models.CharField(max_length=12, null=True, blank=True)

    # Public identity visibility flags (M15). Email, phone and birthday have no flag by design.
    show_display_name = models.BooleanField(default=True)
    show_ratings = models.BooleanField(default=True)
    show_chess_com_handle = models.BooleanField(default=False)
    show_city_chapter = models.BooleanField(default=True)

    # First-login preferences (M16)
    onboarding_done = models.BooleanField(default=False)
    play_style = models.CharField(max_length=20, null=True, blank=True)
    mood = models.CharField(max_length=20, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    class Meta:
        db_table = 'users'
        constraints = [
            models.CheckConstraint(condition=models.Q(email=Lower('email')), name='users_email_lowercase'),
            models.CheckConstraint(condition=models.Q(role__in=['player', 'admin']), name='users_role_valid'),
            models.CheckConstraint(condition=models.Q(status__in=['active', 'suspended']), name='users_status_valid'),
        ]

    @property
    def is_admin(self) -> bool:
        return self.role == 'admin'

    @property
    def profile_complete(self) -> bool:
        return bool(self.city) and bool(self.phone)


class Rating(models.Model):
    """Per-pool rating summary (the append-only ledger is a later slice)."""

    POOL_CHOICES = [('classical', 'Classical'), ('rapid', 'Rapid'), ('blitz', 'Blitz')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ratings')
    pool = models.CharField(max_length=10, choices=POOL_CHOICES)
    rating = models.IntegerField(default=1500)
    rd = models.IntegerField(default=350)
    volatility = models.DecimalField(max_digits=8, decimal_places=6, default=0.06)
    games_played = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ratings'
        constraints = [models.UniqueConstraint(fields=['user', 'pool'], name='ratings_user_pool_unique')]


class AuthFamily(models.Model):
    """One refresh-token family per sign-in (contract 2.4). Holds no secret: tokens are HMAC-derived (see tokens.py)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='auth_families')
    role = models.CharField(max_length=10)  # role at sign-in; a difference from the user's role ends the family
    created_at = models.DateTimeField()
    expires_at = models.DateTimeField()  # absolute lifetime: 14 days player, 12 hours admin
    last_used_at = models.DateTimeField()
    generation = models.PositiveIntegerField(default=0)  # the only valid refresh token generation
    rotated_at = models.DateTimeField(null=True)  # when `generation` was reached (grace window anchor)
    revoked_at = models.DateTimeField(null=True, db_index=True)
    revoked_reason = models.CharField(max_length=20, null=True)  # logout | REFRESH_REUSED | SESSION_EXPIRED | ...

    class Meta:
        db_table = 'auth_families'
        indexes = [models.Index(fields=['user', 'revoked_at'], name='authfam_user_revoked')]


class PasswordResetToken(models.Model):
    """Single-use reset token. Only the SHA-256 digest of the emailed token is stored."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reset_tokens')
    token_hash = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField()
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True)

    class Meta:
        db_table = 'password_reset_tokens'


class StepUpGrant(models.Model):
    """5-minute single-use re-authentication grant (contract 2.4). The grant id is the token's jti."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='step_up_grants')
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True)

    class Meta:
        db_table = 'step_up_grants'
