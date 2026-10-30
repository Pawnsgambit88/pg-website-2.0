# Django Migration Plan — Pawn's Gambit (pgchess.in)

## Overview

**Goal**: Move all backend logic (auth, database access, business logic, payments) out of
Supabase and into a Django REST API. The React frontend will talk only to Django.
Supabase Postgres is kept as the database — Django connects to it directly via the ORM.

```
Before:
  React ──────────────────► Supabase (Auth + DB + Edge Functions)

After:
  React ──► Django REST API ──► Supabase Postgres (DB only)
                          └───► Razorpay API
```

---

## Table of Contents

1. [Phase 1 — Django Project Setup](#phase-1--django-project-setup)
2. [Phase 2 — Authentication](#phase-2--authentication)
3. [Phase 3 — Core API Endpoints](#phase-3--core-api-endpoints)

---

## Phase 1 — Django Project Setup

### 1.1 Folder Structure

Create a `backend/` folder at the repo root (alongside the existing `src/` frontend):

```
PG_Website/
├── src/                     # React frontend (unchanged for now)
├── backend/                 # NEW — Django project root
│   ├── manage.py
│   ├── requirements.txt
│   ├── pgchess/             # Django project settings package
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── accounts/            # Auth app — users, login, register
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── urls.py
│   ├── tournaments/         # Tournaments, rounds, pairings app
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── urls.py
│   ├── payments/            # Razorpay integration app
│   │   ├── views.py
│   │   └── urls.py
│   └── gallery/             # Gallery photos app
│       ├── models.py
│       ├── serializers.py
│       ├── views.py
│       └── urls.py
```

---

### 1.2 Python Dependencies

**`backend/requirements.txt`**:
```
django>=5.0
djangorestframework>=3.15
djangorestframework-simplejwt>=5.3
django-cors-headers>=4.3
psycopg2-binary>=2.9
python-dotenv>=1.0
requests>=2.31          # for Razorpay API calls
django-anymail[sendgrid]>=10.0   # or swap for resend/mailgun
```

Install:
```bash
cd backend
pip install -r requirements.txt
```

---

### 1.3 Settings

**`backend/pgchess/settings.py`** key sections:

```python
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.environ['DJANGO_SECRET_KEY']
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'your-railway-app.railway.app']

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.auth',          # needed for permissions
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'accounts',
    'tournaments',
    'payments',
    'gallery',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',   # must be first
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    # ... rest of default middleware
]

# ── Database ──────────────────────────────────────────────────────────────────
# Point directly at the Supabase Postgres instance.
# Get the connection string from: Supabase → Project → Settings → Database → Connection string (URI)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME':     os.environ['DB_NAME'],       # e.g. postgres
        'USER':     os.environ['DB_USER'],       # e.g. postgres
        'PASSWORD': os.environ['DB_PASSWORD'],
        'HOST':     os.environ['DB_HOST'],       # e.g. db.xxxx.supabase.co
        'PORT':     os.environ.get('DB_PORT', '5432'),
        'OPTIONS': {
            'options': '-c search_path=public'   # use the public schema
        },
    }
}

# ── JWT Auth ──────────────────────────────────────────────────────────────────
from datetime import timedelta

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=14),
    'ROTATE_REFRESH_TOKENS':  True,
    'AUTH_HEADER_TYPES':      ('Bearer',),
}

# ── CORS ──────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = [
    'https://pgchess.in',
    'https://www.pgchess.in',
    'http://localhost:5173',
]
CORS_ALLOW_CREDENTIALS = True   # needed if you use httpOnly cookies for refresh token

# ── Email (for password reset) ─────────────────────────────────────────────
ANYMAIL = {
    'SENDGRID_API_KEY': os.environ.get('SENDGRID_API_KEY', ''),
}
EMAIL_BACKEND = 'anymail.backends.sendgrid.EmailBackend'
DEFAULT_FROM_EMAIL = 'Pawn\'s Gambit <noreply@pgchess.in>'
```

**`backend/.env`** (never commit this):
```
DJANGO_SECRET_KEY=your-secret-key-here
DEBUG=True
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-supabase-db-password
DB_HOST=db.xxxxxxxxxxxx.supabase.co
DB_PORT=5432
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=your-razorpay-secret
SENDGRID_API_KEY=SG.xxxx
ADMIN_EMAIL=admin@pgchess.in
```

---

### 1.4 Django Models

Django will use the **existing Supabase Postgres tables** — no schema changes needed.
The models below map exactly to the existing `schema.sql`.

> **Important**: Set `managed = False` on every model so Django never tries to
> run migrations against these tables (they already exist).

**`backend/accounts/models.py`**:
```python
import uuid
from django.db import models

class User(models.Model):
    ROLE_CHOICES = [('player', 'Player'), ('admin', 'Admin')]
    SKILL_CHOICES = [
        ('beginner', 'Beginner'), ('intermediate', 'Intermediate'),
        ('tournament', 'Tournament'), ('expert', 'Expert'), ('titled', 'Titled'),
    ]

    id                 = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name               = models.TextField()
    email              = models.EmailField(unique=True)
    city               = models.TextField(blank=True, null=True)
    area               = models.TextField(blank=True, null=True)
    pincode            = models.TextField(blank=True, null=True)
    phone              = models.TextField(blank=True, null=True)
    chess_com_username = models.TextField(blank=True, null=True)
    fide_id            = models.TextField(blank=True, null=True)
    gender             = models.TextField(blank=True, null=True)
    birthday           = models.DateField(blank=True, null=True)
    skill_level        = models.TextField(choices=SKILL_CHOICES, blank=True, null=True)
    role               = models.TextField(choices=ROLE_CHOICES, default='player')
    password_hash      = models.TextField()   # bcrypt hash stored by Django
    created_at         = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed  = False
        db_table = 'users'          # maps to existing public.users table

    @property
    def is_admin(self):
        return self.role == 'admin'


class Rating(models.Model):
    TIME_CONTROL_CHOICES = [('classical', 'Classical'), ('rapid', 'Rapid'), ('blitz', 'Blitz')]

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user         = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ratings')
    rating       = models.IntegerField(default=1500)
    rd           = models.IntegerField(default=350)
    volatility   = models.DecimalField(max_digits=8, decimal_places=6, default=0.06)
    games_played = models.IntegerField(default=0)
    time_control = models.TextField(choices=TIME_CONTROL_CHOICES, default='rapid')
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        managed  = False
        db_table = 'ratings'
```

**`backend/tournaments/models.py`**:
```python
import uuid
from django.db import models
from accounts.models import User

class Tournament(models.Model):
    STATUS_CHOICES = [
        ('upcoming', 'Upcoming'), ('registration_open', 'Registration Open'),
        ('ongoing', 'Ongoing'), ('completed', 'Completed'),
    ]
    TIME_CONTROL_CHOICES = [('classical', 'Classical'), ('rapid', 'Rapid'), ('blitz', 'Blitz')]

    id                    = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name                  = models.TextField()
    date                  = models.DateTimeField()
    format                = models.TextField(blank=True, null=True)
    rounds                = models.IntegerField(blank=True, null=True)
    venue                 = models.TextField(blank=True, null=True)
    is_online             = models.BooleanField(default=False)
    entry_fee             = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    prize_pool            = models.TextField(blank=True, null=True)
    max_players           = models.IntegerField(blank=True, null=True)
    status                = models.TextField(choices=STATUS_CHOICES, default='upcoming')
    registration_deadline = models.DateTimeField(blank=True, null=True)
    time_control          = models.TextField(choices=TIME_CONTROL_CHOICES, default='rapid')
    location_link         = models.TextField(blank=True, null=True)
    created_at            = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed  = False
        db_table = 'tournaments'


class TournamentRegistration(models.Model):
    PAYMENT_STATUS_CHOICES = [('pending', 'Pending'), ('paid', 'Paid'), ('refunded', 'Refunded')]

    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4)
    tournament          = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='registrations')
    user                = models.ForeignKey(User, on_delete=models.CASCADE, related_name='registrations')
    payment_status      = models.TextField(choices=PAYMENT_STATUS_CHOICES, default='pending')
    razorpay_payment_id = models.TextField(blank=True, null=True)
    razorpay_order_id   = models.TextField(blank=True, null=True)
    score               = models.DecimalField(max_digits=5, decimal_places=1, blank=True, null=True)
    rating_before       = models.IntegerField(blank=True, null=True)
    rating_after        = models.IntegerField(blank=True, null=True)
    is_pairing_active   = models.BooleanField(default=True)
    registered_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed  = False
        db_table = 'tournament_registrations'
        unique_together = [('tournament', 'user')]


class TournamentRound(models.Model):
    id            = models.UUIDField(primary_key=True, default=uuid.uuid4)
    tournament    = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='rounds')
    round_number  = models.IntegerField()
    is_complete   = models.BooleanField(default=False)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed  = False
        db_table = 'tournament_rounds'
        unique_together = [('tournament', 'round_number')]


class Pairing(models.Model):
    RESULT_CHOICES = [(0, '0–1'), (0.5, '½–½'), (1, '1–0')]

    id        = models.UUIDField(primary_key=True, default=uuid.uuid4)
    round     = models.ForeignKey(TournamentRound, on_delete=models.CASCADE, related_name='pairings')
    player1   = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='pairings_as_white')
    player2   = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='pairings_as_black')
    result    = models.DecimalField(max_digits=3, decimal_places=1, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed  = False
        db_table = 'pairings'
```

**`backend/gallery/models.py`**:
```python
import uuid
from django.db import models

class GalleryPhoto(models.Model):
    CATEGORY_CHOICES = [('tournament', 'Tournament'), ('coaching', 'Coaching'), ('event', 'Event')]

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4)
    url        = models.TextField()
    event_name = models.TextField(blank=True, null=True)
    date       = models.DateField(blank=True, null=True)
    caption    = models.TextField(blank=True, null=True)
    category   = models.TextField(choices=CATEGORY_CHOICES, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed  = False
        db_table = 'gallery_photos'
```

---

### 1.5 Schema Changes Needed in Supabase Postgres

Two small changes are required because Supabase currently handles auth via `auth.users`
(a separate schema). Django will manage its own users in the `public.users` table.

Run these in the **Supabase SQL Editor**:

```sql
-- 1. Add password_hash column to users (Django will store bcrypt hashes here)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT '';

-- 2. Remove the foreign key from users.id → auth.users (Django won't use auth.users)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- 3. Make id self-generated (no longer linked to auth.users)
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- 4. Add missing columns referenced in the frontend but not in schema.sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS area    TEXT,
  ADD COLUMN IF NOT EXISTS pincode TEXT,
  ADD COLUMN IF NOT EXISTS gender  TEXT,
  ADD COLUMN IF NOT EXISTS birthday DATE;

-- 5. Add time_control to ratings (the frontend filters by this)
ALTER TABLE public.ratings
  ADD COLUMN IF NOT EXISTS time_control TEXT NOT NULL DEFAULT 'rapid'
    CHECK (time_control IN ('classical', 'rapid', 'blitz'));

ALTER TABLE public.ratings DROP CONSTRAINT IF EXISTS ratings_user_id_key;
ALTER TABLE public.ratings ADD CONSTRAINT ratings_user_id_time_control_key
  UNIQUE (user_id, time_control);

-- 6. Add is_pairing_active and location_link (used in frontend, missing from schema)
ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS is_pairing_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS location_link TEXT,
  ADD COLUMN IF NOT EXISTS time_control  TEXT NOT NULL DEFAULT 'rapid'
    CHECK (time_control IN ('classical', 'rapid', 'blitz'));

-- 7. Disable all RLS — Django enforces authorization instead
ALTER TABLE public.users                    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments              DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_rounds        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pairings                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_photos           DISABLE ROW LEVEL SECURITY;
```

---

### 1.6 URL Routing

**`backend/pgchess/urls.py`**:
```python
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('api/auth/',        include('accounts.urls')),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/tournaments/', include('tournaments.urls')),
    path('api/payments/',    include('payments.urls')),
    path('api/gallery/',     include('gallery.urls')),
]
```

---

### 1.7 Deploying to Railway

1. Push the `backend/` folder to GitHub (same repo is fine)
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
3. Set the **Root Directory** to `backend/`
4. Add all env vars from `.env` in Railway's **Variables** tab
5. Set the **Start Command**: `gunicorn pgchess.wsgi:application --bind 0.0.0.0:$PORT`
6. Add `gunicorn` to `requirements.txt`
7. Railway gives you a URL like `https://pgchess-backend.railway.app` — this becomes `VITE_API_BASE_URL` in Vercel

---

---

## Phase 2 — Authentication

### 2.1 How Auth Changes

| | Before (Supabase) | After (Django) |
|---|---|---|
| Token type | Supabase JWT | Standard JWT (access + refresh) |
| Token storage | Supabase SDK handles it | Access token in memory; refresh token in httpOnly cookie |
| Session check on load | `supabase.auth.getSession()` | `GET /api/auth/me/` with stored access token |
| Auth state changes | `supabase.auth.onAuthStateChange()` | Handled in React context on token refresh |
| Password reset | Supabase email with magic link | Django sends email with a signed token link |

---

### 2.2 Auth Endpoints

#### `POST /api/auth/register/`

Replaces `supabase.auth.signUp(...)`.

**Request body**:
```json
{
  "email": "player@example.com",
  "password": "securepassword",
  "name": "Anirudh Kumar",
  "city": "Hyderabad",
  "phone": "9876543210",
  "chess_com_username": "anirudh99",
  "fide_id": "25048123",
  "skill_level": "intermediate"
}
```

**What Django does**:
1. Validate email uniqueness
2. Hash password with `make_password()` (bcrypt)
3. Determine initial rating based on `skill_level` (same logic as the old DB trigger)
4. In a single DB transaction:
   - Insert into `users`
   - Insert into `ratings` (one row per time control: classical, rapid, blitz)
5. Send a confirmation email (optional — can skip for MVP)
6. Return JWT access + refresh tokens immediately

**Response** (201):
```json
{
  "access": "eyJ...",
  "refresh": "eyJ...",
  "user": {
    "id": "uuid",
    "name": "Anirudh Kumar",
    "email": "player@example.com",
    "role": "player",
    "city": "Hyderabad",
    "ratings": [
      { "time_control": "rapid", "rating": 1100, "rd": 300, "games_played": 0 }
    ]
  }
}
```

---

#### `POST /api/auth/login/`

Replaces `supabase.auth.signInWithPassword(...)`.

**Request body**:
```json
{ "email": "player@example.com", "password": "securepassword" }
```

**What Django does**:
1. Look up user by email
2. Verify password with `check_password()`
3. Generate JWT access + refresh tokens

**Response** (200): same shape as register response

---

#### `POST /api/auth/logout/`

Replaces `supabase.auth.signOut()`.

- Clears the httpOnly refresh token cookie server-side
- Frontend discards the access token from memory

**Response** (200): `{ "detail": "Logged out." }`

---

#### `GET /api/auth/me/`

Replaces `supabase.from('users').select('*, ratings(*)')` in `AuthContext`.
Called on every app load to restore session.

**Headers**: `Authorization: Bearer <access_token>`

**Response** (200):
```json
{
  "id": "uuid",
  "name": "Anirudh Kumar",
  "email": "player@example.com",
  "role": "player",
  "city": "Hyderabad",
  "area": "Banjara Hills",
  "pincode": "500034",
  "phone": "9876543210",
  "chess_com_username": "anirudh99",
  "fide_id": "25048123",
  "gender": "Male",
  "birthday": "2000-05-14",
  "skill_level": "intermediate",
  "ratings": [
    { "time_control": "rapid",     "rating": 1240, "rd": 180, "games_played": 12 },
    { "time_control": "blitz",     "rating": 1100, "rd": 300, "games_played": 0  },
    { "time_control": "classical", "rating": 1100, "rd": 300, "games_played": 0  }
  ]
}
```

---

#### `PATCH /api/auth/me/`

Replaces `supabase.from('users').update(updates).eq('id', userId)` in `TournamentRegister.jsx` (profile completion step) and `Profile.jsx`.

**Request body** (any subset of updatable fields):
```json
{
  "city": "Hyderabad",
  "area": "Banjara Hills",
  "pincode": "500034",
  "gender": "Male",
  "birthday": "2000-05-14",
  "chess_com_username": "anirudh99",
  "fide_id": "25048123"
}
```

**Response** (200): same as `GET /api/auth/me/`

---

#### `POST /api/auth/password-reset/`

Replaces `supabase.auth.resetPasswordForEmail(...)`.

**Request body**: `{ "email": "player@example.com" }`

**What Django does**:
1. Generate a signed token (using `django.core.signing`) that encodes `user_id + timestamp`
2. Send email with a link: `https://pgchess.in/reset-password?token=<signed_token>`
3. Always return 200 (don't leak whether the email exists)

**Response** (200): `{ "detail": "If this email is registered, a reset link has been sent." }`

---

#### `POST /api/auth/password-reset/confirm/`

Replaces the Supabase redirect handling in `ResetPassword.jsx`.

**Request body**:
```json
{ "token": "<signed_token_from_email>", "new_password": "newpassword123" }
```

**What Django does**:
1. Validate and unsign the token (verify it hasn't expired — 1 hour TTL)
2. Look up the user
3. Hash and save the new password

**Response** (200): `{ "detail": "Password updated successfully." }`

---

### 2.3 Django Auth Implementation

**`backend/accounts/views.py`** (key views):

```python
import uuid
from django.core import signing
from django.core.mail import send_mail
from django.contrib.auth.hashers import make_password, check_password
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, Rating
from .serializers import UserSerializer

SKILL_RATING_MAP = {
    'beginner':     (800,  350),
    'intermediate': (1100, 300),
    'tournament':   (1400, 250),
    'expert':       (1800, 200),
    'titled':       (2200, 150),
}

def get_tokens(user):
    refresh = RefreshToken()
    refresh['user_id'] = str(user.id)
    refresh['role']    = user.role
    return str(refresh.access_token), str(refresh)


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    data = request.data
    if User.objects.filter(email=data['email']).exists():
        return Response({'email': 'This email is already registered.'}, status=400)

    skill = data.get('skill_level', 'beginner')
    init_rating, init_rd = SKILL_RATING_MAP.get(skill, (1500, 350))

    user = User.objects.create(
        id=uuid.uuid4(),
        name=data['name'],
        email=data['email'],
        password_hash=make_password(data['password']),
        city=data.get('city'),
        phone=data.get('phone'),
        chess_com_username=data.get('chess_com_username'),
        fide_id=data.get('fide_id'),
        skill_level=skill,
        role='player',
    )

    # Create ratings for all three time controls
    for tc in ['classical', 'rapid', 'blitz']:
        Rating.objects.create(
            id=uuid.uuid4(), user=user,
            rating=init_rating, rd=init_rd,
            volatility=0.06, games_played=0,
            time_control=tc,
        )

    access, refresh = get_tokens(user)
    return Response({'access': access, 'refresh': refresh, 'user': UserSerializer(user).data}, status=201)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    try:
        user = User.objects.get(email=request.data['email'])
    except User.DoesNotExist:
        return Response({'detail': 'Invalid credentials.'}, status=401)

    if not check_password(request.data['password'], user.password_hash):
        return Response({'detail': 'Invalid credentials.'}, status=401)

    access, refresh = get_tokens(user)
    return Response({'access': access, 'refresh': refresh, 'user': UserSerializer(user).data})


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def me(request):
    user_id = request.auth.payload['user_id']
    user = User.objects.prefetch_related('ratings').get(id=user_id)

    if request.method == 'PATCH':
        ALLOWED = ['name', 'city', 'area', 'pincode', 'phone', 'gender',
                   'birthday', 'chess_com_username', 'fide_id']
        for field in ALLOWED:
            if field in request.data:
                setattr(user, field, request.data[field])
        user.save()

    return Response(UserSerializer(user).data)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    email = request.data.get('email', '')
    try:
        user = User.objects.get(email=email)
        token = signing.dumps({'user_id': str(user.id)}, salt='pw-reset', compress=True)
        reset_url = f"https://pgchess.in/reset-password?token={token}"
        send_mail(
            subject="Reset your Pawn's Gambit password",
            message=f"Click here to reset your password: {reset_url}\n\nThis link expires in 1 hour.",
            from_email=None,   # uses DEFAULT_FROM_EMAIL
            recipient_list=[email],
        )
    except User.DoesNotExist:
        pass   # don't reveal whether email exists
    return Response({'detail': "If this email is registered, a reset link has been sent."})


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    token = request.data.get('token')
    new_password = request.data.get('new_password')
    try:
        data = signing.loads(token, salt='pw-reset', max_age=3600)   # 1 hour expiry
        user = User.objects.get(id=data['user_id'])
        user.password_hash = make_password(new_password)
        user.save()
        return Response({'detail': 'Password updated successfully.'})
    except signing.SignatureExpired:
        return Response({'detail': 'Reset link has expired.'}, status=400)
    except (signing.BadSignature, User.DoesNotExist):
        return Response({'detail': 'Invalid reset link.'}, status=400)
```

**`backend/accounts/urls.py`**:
```python
from django.urls import path
from . import views

urlpatterns = [
    path('register/',               views.register,                name='register'),
    path('login/',                  views.login,                   name='login'),
    path('me/',                     views.me,                      name='me'),
    path('password-reset/',         views.password_reset_request,  name='password_reset'),
    path('password-reset/confirm/', views.password_reset_confirm,  name='password_reset_confirm'),
]
```

---

### 2.4 Frontend Changes — `AuthContext.jsx`

Replace the entire `supabase.auth.*` usage. Create `src/lib/api.js` first:

```js
// src/lib/api.js
const BASE = import.meta.env.VITE_API_BASE_URL   // e.g. https://pgchess-backend.railway.app

let accessToken = null   // stored in memory only (not localStorage)

export function setAccessToken(token) { accessToken = token }
export function clearAccessToken()    { accessToken = null }

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth && accessToken) headers['Authorization'] = `Bearer ${accessToken}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: 'include',   // sends httpOnly refresh token cookie
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401 && auth) {
    // Try refreshing the token
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      headers['Authorization'] = `Bearer ${accessToken}`
      return fetch(`${BASE}${path}`, { method, headers, credentials: 'include', body: body ? JSON.stringify(body) : undefined })
    }
  }
  return res
}

async function refreshAccessToken() {
  const res = await fetch(`${BASE}/api/auth/token/refresh/`, {
    method: 'POST',
    credentials: 'include',
  })
  if (res.ok) {
    const data = await res.json()
    setAccessToken(data.access)
    return true
  }
  clearAccessToken()
  return false
}
```

The new `AuthContext.jsx` then calls `api('/api/auth/me/')` instead of `supabase.auth.getSession()`,
and `api('/api/auth/login/', { method: 'POST', body: { email, password } })` instead of
`supabase.auth.signInWithPassword(...)`. The shape of the `profile` object returned is identical
to what the frontend already expects.

---

---

## Phase 3 — Core API Endpoints

### 3.1 Tournaments

#### `GET /api/tournaments/`

Used in: `Tournaments.jsx`, `Home.jsx`

**Query params** (optional):
- `?status=registration_open` — filter by status
- `?upcoming=true` — tournaments with date in the future

**Response** (200):
```json
[
  {
    "id": "uuid",
    "name": "PG Open #12",
    "date": "2026-10-15T10:00:00+05:30",
    "format": "Swiss, Rapid 15+10",
    "venue": "Chess Club, Hyderabad",
    "is_online": false,
    "entry_fee": "200.00",
    "prize_pool": "1st: ₹2000, 2nd: ₹1000",
    "max_players": 64,
    "status": "registration_open",
    "registration_deadline": "2026-10-14T23:59:00+05:30",
    "time_control": "rapid",
    "location_link": "https://maps.app.goo.gl/...",
    "registered_count": 18
  }
]
```

---

#### `GET /api/tournaments/:id/`

Used in: `TournamentDetail.jsx`, `TournamentRegister.jsx`

Returns a single tournament with `registered_count` included.

---

#### `POST /api/tournaments/` _(admin only)_

Used in: `Admin.jsx` — create tournament.

**Request body**:
```json
{
  "name": "PG Open #12",
  "date": "2026-10-15T10:00:00+05:30",
  "format": "Swiss, Rapid 15+10",
  "venue": "Chess Club, Hyderabad",
  "is_online": false,
  "entry_fee": 200,
  "prize_pool": "1st: ₹2000, 2nd: ₹1000",
  "max_players": 64,
  "status": "upcoming",
  "registration_deadline": "2026-10-14T23:59:00+05:30",
  "time_control": "rapid",
  "location_link": "https://maps.app.goo.gl/..."
}
```

Django enforces: only users with `role == 'admin'` can call this (use a custom `IsAdmin` permission class).

---

#### `PATCH /api/tournaments/:id/` _(admin only)_

Used in: `Admin.jsx` — change status inline.

**Request body**: `{ "status": "ongoing" }` (any subset of tournament fields)

---

#### `GET /api/tournaments/:id/registrations/`

Used in: `Admin.jsx` (full list with player details), `TournamentRegister.jsx` (paid players list).

**Query params**:
- `?payment_status=paid` — filter to paid only
- `?detail=true` — include nested user + rating info (admin use)

**Response** (200):
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "user_name": "Anirudh Kumar",
    "user_email": "player@example.com",
    "user_city": "Hyderabad",
    "rating": 1240,
    "rd": 180,
    "payment_status": "paid",
    "score": 2.5,
    "is_pairing_active": true,
    "registered_at": "2026-10-01T12:00:00Z"
  }
]
```

---

#### `POST /api/tournaments/:id/registrations/`

Used in: `TournamentRegister.jsx` — **free tournaments only**. Paid tournaments use the payments flow (Phase 4).

**Headers**: `Authorization: Bearer <token>`

**Response** (201): `{ "id": "uuid", "payment_status": "paid" }`

---

#### `PATCH /api/tournaments/:id/registrations/:reg_id/` _(admin only)_

Used in: `Admin.jsx` — toggle `is_pairing_active` (mark player absent/present).

**Request body**: `{ "is_pairing_active": false }`

---

#### `GET /api/tournaments/:id/leaderboard/`

Used in: `Tournaments.jsx` leaderboard tab.

Returns all users ordered by rating for the tournament's time control.

**Response** (200):
```json
[
  {
    "rank": 1,
    "user_id": "uuid",
    "name": "Anirudh Kumar",
    "rating": 1850,
    "rd": 95,
    "games_played": 34,
    "city": "Hyderabad"
  }
]
```

---

#### `GET /api/tournaments/:id/export-csv/` _(admin only)_

Used in: `Admin.jsx` export button.

Returns a `text/csv` file response (Django uses `StreamingHttpResponse` for this).

---

### 3.2 Rounds and Pairings

#### `GET /api/tournaments/:id/rounds/`

Used in: `Admin.jsx`

Returns all rounds with their pairings nested.

**Response** (200):
```json
[
  {
    "id": "uuid",
    "round_number": 1,
    "is_complete": true,
    "pairings": [
      {
        "id": "uuid",
        "player1_id": "uuid",
        "player1_name": "Anirudh Kumar",
        "player2_id": "uuid",
        "player2_name": "Sairam Reddy",
        "result": 1.0
      }
    ]
  }
]
```

---

#### `POST /api/tournaments/:id/rounds/` _(admin only)_

Used in: `Admin.jsx` — add a round.

Django validates that all pairings in the previous round have results before creating a new round.

**Response** (201): the new round object with `"pairings": []`

---

#### `POST /api/rounds/:id/pairings/` _(admin only)_

Used in: `Admin.jsx` — add a blank pairing manually.

**Response** (201): `{ "id": "uuid", "player1_id": null, "player2_id": null, "result": null }`

---

#### `PATCH /api/pairings/:id/` _(admin only)_

Used in: `Admin.jsx` — update player assignment or result.

**Request body** (any combination):
```json
{ "player1_id": "uuid", "player2_id": "uuid", "result": 1.0 }
```

When `result` is updated, Django automatically recalculates scores for both players and updates `tournament_registrations.score`.

---

#### `POST /api/rounds/:id/generate-swiss/` _(admin only)_

Used in: `Admin.jsx` — "Generate Swiss" button.

This moves the Swiss pairing algorithm **out of the frontend JS** and into Django.
The same logic from `Admin.jsx` (`buildSwissPairings`) is ported to Python.

**Request body**: `{}` (no body needed — round ID is in the URL)

**What Django does**:
1. Load all paid + active registrations for the tournament
2. Load all previous pairings (to avoid rematches)
3. Run Swiss pairing algorithm (score sort, top-half vs bottom-half for R1, color balancing)
4. Delete existing pairings for this round (if any)
5. Bulk insert new pairings

**Response** (200):
```json
{
  "generated": 8,
  "pairings": [ ... ]
}
```

---

#### `POST /api/rounds/:id/update-ratings/` _(admin only)_

Used in: `Admin.jsx` — "Finalise & Update Ratings" button.

Replaces the `update-ratings` Supabase Edge Function.

**What Django does**:
1. Load all pairings for this round (must all have results)
2. Load current ratings for all involved players
3. Run Glicko-2 algorithm (port `src/lib/glicko2.js` to Python)
4. Write updated ratings back to the `ratings` table
5. Mark the round as complete

**Response** (200): `{ "updated_players": 16 }`

---

#### `POST /api/rounds/:id/complete/` _(admin only)_

Used in: `Admin.jsx` — "Mark Complete" button (without recalculating ratings).

Sets `is_complete = True` on the round.

**Response** (200): `{ "id": "uuid", "is_complete": true }`

---

### 3.3 User Profile

#### `GET /api/profile/`

Used in: `Profile.jsx`

Same as `GET /api/auth/me/` but can be made public by user ID.

Also available as: `GET /api/profile/?user_id=<uuid>` for public profile views.

---

#### `GET /api/profile/tournament-history/`

Used in: `Profile.jsx` — list of tournaments the logged-in user has registered for.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
[
  {
    "tournament_id": "uuid",
    "tournament_name": "PG Open #11",
    "date": "2026-09-01T10:00:00Z",
    "payment_status": "paid",
    "score": 3.5,
    "rating_before": 1190,
    "rating_after": 1240,
    "status": "completed"
  }
]
```

---

### 3.4 Gallery

#### `GET /api/gallery/`

Used in: `Gallery.jsx`

**Query params** (optional): `?category=tournament`

**Response** (200):
```json
[
  {
    "id": "uuid",
    "url": "https://xxxx.supabase.co/storage/v1/object/public/gallery/pic.jpg",
    "event_name": "PG Open #10",
    "date": "2026-08-15",
    "caption": "Prize distribution ceremony",
    "category": "tournament"
  }
]
```

---

### 3.5 Django Permission Classes

Two custom permission classes cover all of Phase 3:

```python
# backend/tournaments/permissions.py
from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsAdminUser(BasePermission):
    """Only users with role='admin' can access."""
    def has_permission(self, request, view):
        return (
            request.user
            and request.auth
            and request.auth.payload.get('role') == 'admin'
        )

class IsAdminOrReadOnly(BasePermission):
    """Read access for anyone; write access for admins only."""
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return (
            request.user
            and request.auth
            and request.auth.payload.get('role') == 'admin'
        )
```

Use these on views:
```python
from .permissions import IsAdminUser, IsAdminOrReadOnly

class TournamentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    ...
```

---

## Summary Checklist

### Phase 1
- [ ] Create `backend/` Django project structure
- [ ] Install requirements
- [ ] Connect Django to Supabase Postgres
- [ ] Define all models with `managed = False`
- [ ] Run SQL migrations in Supabase (add missing columns, disable RLS)
- [ ] Set up CORS and JWT settings
- [ ] Deploy to Railway and verify DB connection

### Phase 2
- [ ] Build auth views: register, login, me (GET+PATCH), password-reset, password-reset/confirm
- [ ] Build `UserSerializer` with nested ratings
- [ ] Create `src/lib/api.js` in the frontend
- [ ] Rewrite `AuthContext.jsx` to use Django endpoints
- [ ] Test end-to-end: sign up → log in → view profile → reset password

### Phase 3
- [ ] Build tournament CRUD endpoints
- [ ] Build registration endpoints (list, create, patch)
- [ ] Build round + pairing endpoints
- [ ] Port Swiss pairing algorithm to Python
- [ ] Port Glicko-2 rating update to Python
- [ ] Build gallery endpoint
- [ ] Build profile history endpoint
- [ ] Replace all `supabase.from(...)` calls in React pages with `api(...)` calls
- [ ] Remove `@supabase/supabase-js` from `package.json`
