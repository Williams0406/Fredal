import os
from pathlib import Path
from datetime import timedelta
import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


def load_env_file(env_path):
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")

        os.environ.setdefault(key, value)


def env_list(name):
    return [value.strip() for value in os.environ.get(name, "").split(",") if value.strip()]


load_env_file(BASE_DIR / ".env")


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "unsafe-secret-key")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get("DEBUG", "False") == "True"
IS_RAILWAY = any(
    os.environ.get(var_name)
    for var_name in (
        "RAILWAY_ENVIRONMENT",
        "RAILWAY_ENVIRONMENT_NAME",
        "RAILWAY_PROJECT_ID",
        "RAILWAY_SERVICE_ID",
        "RAILWAY_PUBLIC_DOMAIN",
        "RAILWAY_STATIC_URL",
    )
)

USE_CLOUDINARY = bool(
    IS_RAILWAY
    and (
        os.environ.get("CLOUDINARY_URL")
        or (
            os.environ.get("CLOUDINARY_CLOUD_NAME")
            and os.environ.get("CLOUDINARY_API_KEY")
            and os.environ.get("CLOUDINARY_API_SECRET")
        )
    )
)

ALLOWED_HOSTS = env_list("ALLOWED_HOSTS") or (["localhost", "127.0.0.1"] if DEBUG else [])

CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS") or (
    ["http://localhost:3000", "http://127.0.0.1:3000"] if DEBUG else []
)

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
    "corsheaders",
    "app",
]

if USE_CLOUDINARY:
    INSTALLED_APPS.append("cloudinary_storage")
    INSTALLED_APPS.append("cloudinary")

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend"
    ],
}

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    "whitenoise.middleware.WhiteNoiseMiddleware",
    'django.contrib.sessions.middleware.SessionMiddleware',
    "corsheaders.middleware.CorsMiddleware",
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),

    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,

    "AUTH_HEADER_TYPES": ("Bearer",),

    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",

    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),

    "TOKEN_TYPE_CLAIM": "token_type",
}

# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{BASE_DIR / 'db.sqlite3'}")

DATABASES = {
    "default": dj_database_url.parse(
        DATABASE_URL,
        conn_max_age=600,
        ssl_require=DATABASE_URL.startswith("postgres"),
    )
}


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'America/Lima'

USE_I18N = True

USE_TZ = False


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# WhiteNoise handles static files always.
# Cloudinary handles media (uploads) only when USE_CLOUDINARY is True.
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

if USE_CLOUDINARY:
    STORAGES["default"] = {
        "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage",
    }
    CLOUDINARY_STORAGE = {
        "CLOUD_NAME": os.environ.get("CLOUDINARY_CLOUD_NAME"),
        "API_KEY": os.environ.get("CLOUDINARY_API_KEY"),
        "API_SECRET": os.environ.get("CLOUDINARY_API_SECRET"),
        "SECURE": os.environ.get("CLOUDINARY_SECURE", "True") == "True",
    }


# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# AUTH_USER_MODEL = 'api.Usuario'

CORS_ALLOW_ALL_ORIGINS = False

CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS") or (
    ["http://localhost:3000", "http://127.0.0.1:3000"] if DEBUG else []
)

CORS_ALLOW_HEADERS = [
    "authorization",
    "content-type",
]
