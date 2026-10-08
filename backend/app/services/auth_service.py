import bcrypt


# ---------------------------------------------------------
# PASSWORD POLICY
# ---------------------------------------------------------

MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_BYTES = 72


# ---------------------------------------------------------
# VALIDATE PASSWORD
# ---------------------------------------------------------

def validate_password(password: str) -> None:
    """
    Validate password requirements before hashing.

    bcrypt has a maximum input size of 72 bytes, so we
    explicitly enforce that limit instead of silently
    truncating passwords.
    """

    if not password:
        raise ValueError("Password is required.")

    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(
            f"Password must contain at least {MIN_PASSWORD_LENGTH} characters."
        )

    if len(password.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise ValueError(
            "Password is too long. Please use a password of 72 bytes or fewer."
        )


# ---------------------------------------------------------
# HASH PASSWORD
# ---------------------------------------------------------

def hash_password(password: str) -> str:
    """
    Securely hash a password using bcrypt.

    The original password is never stored.
    """

    validate_password(password)

    password_bytes = password.encode("utf-8")

    password_hash = bcrypt.hashpw(
        password_bytes,
        bcrypt.gensalt(),
    )

    return password_hash.decode("utf-8")


# ---------------------------------------------------------
# VERIFY PASSWORD
# ---------------------------------------------------------

def verify_password(
    plain_password: str,
    password_hash: str,
) -> bool:
    """
    Verify a login password against a stored bcrypt hash.

    Returns False for invalid input rather than exposing
    internal authentication details.
    """

    if not plain_password or not password_hash:
        return False

    try:
        plain_password_bytes = plain_password.encode("utf-8")
        password_hash_bytes = password_hash.encode("utf-8")

        return bcrypt.checkpw(
            plain_password_bytes,
            password_hash_bytes,
        )

    except (ValueError, TypeError):
        return False