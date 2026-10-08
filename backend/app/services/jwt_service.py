from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from backend.app.config import (
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES,
    JWT_ALGORITHM,
    JWT_SECRET_KEY,
)


# ---------------------------------------------------------
# CREATE ACCESS TOKEN
# ---------------------------------------------------------

def create_access_token(user_id: str) -> str:
    """
    Create a short-lived JWT access token.

    The token contains only the minimum identity information
    required to identify the authenticated user.
    """

    now = datetime.now(timezone.utc)

    expires_at = now + timedelta(
        minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": user_id,
        "iat": now,
        "exp": expires_at,
    }

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )


# ---------------------------------------------------------
# DECODE ACCESS TOKEN
# ---------------------------------------------------------

def decode_access_token(token: str) -> str | None:
    """
    Decode and validate a JWT access token.

    Returns the user ID when valid.
    Returns None when the token is invalid or expired.
    """

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )

        user_id = payload.get("sub")

        if not user_id or not isinstance(user_id, str):
            return None

        return user_id

    except JWTError:
        return None