from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from backend.app.services.auth_service import verify_password
from backend.app.services.jwt_service import create_access_token
from backend.app.services.user_service import (
    create_user,
    get_user_by_email,
)


router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Authentication"],
)


# ============================================================
# REGISTER
# ============================================================

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    data: RegisterRequest,
    db: Session = Depends(get_db),
):
    """
    Register a new SafeHer account.

    The password is bcrypt-hashed before being stored.
    The password and password hash are never returned.
    """

    try:
        user = create_user(
            db=db,
            data=data,
        )

        return user

    except ValueError as error:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )

    except Exception:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create account.",
        )


# ============================================================
# LOGIN
# ============================================================

@router.post(
    "/login",
    response_model=TokenResponse,
)
def login_user(
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    """
    Authenticate a SafeHer user and issue a JWT access token.
    """

    user = get_user_by_email(
        db=db,
        email=str(data.email),
    )

    # Use the same response for unknown users and incorrect
    # passwords so we don't reveal whether an email exists.
    if user is None or not verify_password(
        data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is inactive.",
        )

    access_token = create_access_token(
        user_id=user.id,
    )

    from backend.app.config import (
        JWT_ACCESS_TOKEN_EXPIRE_MINUTES,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )