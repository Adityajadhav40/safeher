from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.user import User
from backend.app.services.auth_service import hash_password
from backend.app.schemas.auth import RegisterRequest


def normalize_email(email: str) -> str:
    """
    Normalize email addresses before storing/searching.

    Email is treated case-insensitively for account lookup.
    """

    return email.strip().lower()


def get_user_by_email(
    db: Session,
    email: str,
) -> User | None:
    """
    Find a user by normalized email address.
    """

    normalized_email = normalize_email(email)

    statement = select(User).where(
        User.email == normalized_email
    )

    return db.execute(statement).scalar_one_or_none()


def get_user_by_id(
    db: Session,
    user_id: str,
) -> User | None:
    """
    Find a user by their UUID.
    """

    statement = select(User).where(
        User.id == user_id
    )

    return db.execute(statement).scalar_one_or_none()


def create_user(
    db: Session,
    data: RegisterRequest,
) -> User:
    """
    Create a new SafeHer user.

    Passwords are immediately converted to a bcrypt hash.
    The original password is never stored.
    """

    email = normalize_email(str(data.email))

    existing_user = get_user_by_email(
        db,
        email,
    )

    if existing_user is not None:
        raise ValueError(
            "An account with this email already exists."
        )

    phone = data.phone.strip() if data.phone else None

    if phone:
        statement = select(User).where(
            User.phone == phone
        )

        existing_phone = (
            db.execute(statement)
            .scalar_one_or_none()
        )

        if existing_phone is not None:
            raise ValueError(
                "An account with this phone number already exists."
            )

    user = User(
        full_name=data.full_name.strip(),
        email=email,
        phone=phone,
        password_hash=hash_password(data.password),
        is_active=True,
    )

    db.add(user)

    try:
        db.commit()
        db.refresh(user)

    except Exception:
        db.rollback()
        raise

    return user