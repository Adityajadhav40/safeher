import os
from pathlib import Path

from dotenv import load_dotenv


# ============================================================
# BASE CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

ENV_FILE = BASE_DIR / ".env"

# Load local .env values.
# Existing environment variables are NOT overwritten.
load_dotenv(ENV_FILE, override=False)


# ============================================================
# APPLICATION
# ============================================================

APP_ENV = os.getenv(
    "APP_ENV",
    "development",
).strip().lower()


APP_NAME = os.getenv(
    "APP_NAME",
    "Maharashtra Women Safety API",
).strip()


# ============================================================
# DATABASE
# ============================================================

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "",
).strip()

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not configured."
    )


# ============================================================
# JWT
# ============================================================

JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "",
).strip()

if not JWT_SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY is not configured."
    )

JWT_ALGORITHM = os.getenv(
    "JWT_ALGORITHM",
    "HS256",
).strip()


try:
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(
        os.getenv(
            "JWT_ACCESS_TOKEN_EXPIRE_MINUTES",
            "30",
        )
    )
except ValueError as error:
    raise RuntimeError(
        "JWT_ACCESS_TOKEN_EXPIRE_MINUTES must be a valid integer."
    ) from error


if JWT_ACCESS_TOKEN_EXPIRE_MINUTES <= 0:
    raise RuntimeError(
        "JWT_ACCESS_TOKEN_EXPIRE_MINUTES must be greater than 0."
    )


# ============================================================
# FRONTEND / CORS
# ============================================================

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173",
).strip()


if not FRONTEND_URL:
    raise RuntimeError(
        "FRONTEND_URL is not configured."
    )


# ============================================================
# PRODUCTION VALIDATION
# ============================================================

if APP_ENV == "production":

    if FRONTEND_URL.startswith("http://localhost"):
        raise RuntimeError(
            "Production FRONTEND_URL must use the deployed frontend URL."
        )

    if FRONTEND_URL.startswith("http://"):
        raise RuntimeError(
            "Production FRONTEND_URL must use HTTPS."
        )

    if JWT_SECRET_KEY.lower() in {
        "secret",
        "change-me",
        "your-secret-key",
        "your-secret",
    }:
        raise RuntimeError(
            "A strong JWT_SECRET_KEY is required in production."
        )