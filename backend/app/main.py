from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.config import (
    APP_ENV,
    APP_NAME,
    FRONTEND_URL,
)
from backend.app.database import engine, get_db
from backend.app.dependencies import get_current_user
from backend.app.models import User
from backend.app.routers.auth import router as auth_router
from backend.app.schemas.contact import EmergencyContactRequest

from backend.app.services.contact_service import (
    add_emergency_contact,
    delete_emergency_contact,
    get_emergency_contact,
    get_emergency_contacts,
)

from backend.app.services.location_service import (
    find_nearest_district,
    get_crime_dataset_district,
)

from backend.app.services.ml_service import (
    predict_district_risk,
)

from backend.app.services.risk_service import (
    calculate_risk,
)

from backend.app.services.sos_notification_service import (
    send_sos_notifications,
)

from backend.app.services.sos_service import (
    cancel_sos_event,
    create_sos_event,
    get_sos_event,
    get_user_sos_events,
)


# ============================================================
# FASTAPI APPLICATION
# ============================================================

IS_PRODUCTION = APP_ENV == "production"

app = FastAPI(
    title=APP_NAME,
    description=(
        "AI-based location-aware women safety "
        "and emergency response backend"
    ),
    version="1.0.0",
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
)


app.include_router(auth_router)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
    ],
    allow_credentials=True,
    allow_methods=[
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
    ],
    allow_headers=[
        "Authorization",
        "Content-Type",
    ],
)


# ============================================================
# REQUEST MODELS
# ============================================================


class LocationRequest(BaseModel):
    latitude: float = Field(
        ...,
        ge=-90,
        le=90,
    )

    longitude: float = Field(
        ...,
        ge=-180,
        le=180,
    )


class SOSRequest(BaseModel):
    latitude: float = Field(
        ...,
        ge=-90,
        le=90,
    )

    longitude: float = Field(
        ...,
        ge=-180,
        le=180,
    )

    risk_level: str | None = None

    risk_score: float | None = Field(
        default=None,
        ge=0,
        le=100,
    )


# ============================================================
# ROOT
# ============================================================


@app.get("/")
def root():
    return {
        "message": f"{APP_NAME} is running",
        "status": "online",
        "environment": APP_ENV,
    }


# ============================================================
# HEALTH
# ============================================================


@app.get("/health")
def health(
    db: Session = Depends(get_db),
):
    """
    Health endpoint used by deployment platforms
    and monitoring systems.

    Verifies both:
    1. API process is running.
    2. Database connection is working.
    """

    try:
        db.execute(text("SELECT 1"))

        return {
            "status": "healthy",
            "database": "connected",
            "environment": APP_ENV,
        }

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service temporarily unavailable.",
        )


# ============================================================
# CURRENT AUTHENTICATED USER
# ============================================================


@app.get("/api/v1/auth/me")
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    return {
        "success": True,
        "data": {
            "id": current_user.id,
            "full_name": current_user.full_name,
            "email": current_user.email,
            "phone": current_user.phone,
            "is_active": current_user.is_active,
        },
    }


# ============================================================
# DISTRICT SAFETY
# ============================================================


@app.get("/api/v1/safety/district/{district}")
def district_safety(
    district: str,
    current_user: User = Depends(get_current_user),
):
    try:
        district = district.strip()

        if not district:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="District is required.",
            )

        prediction = predict_district_risk(
            district
        )

        risk = calculate_risk(
            predicted_ipc=prediction[
                "predicted_next_year_ipc"
            ],
            predicted_women_crime=prediction[
                "predicted_next_year_women_crimes"
            ],
        )

        return {
            "success": True,
            "data": {
                **prediction,
                **risk,
            },
        }

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Prediction service error.",
        )


# ============================================================
# LOCATION SAFETY
# ============================================================


@app.post("/api/v1/location/safety")
def location_safety(
    location: LocationRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        location_result = find_nearest_district(
            latitude=location.latitude,
            longitude=location.longitude,
        )

        district = get_crime_dataset_district(
            location_result["district"]
        )

        prediction = predict_district_risk(
            district
        )

        risk = calculate_risk(
            predicted_ipc=prediction[
                "predicted_next_year_ipc"
            ],
            predicted_women_crime=prediction[
                "predicted_next_year_women_crimes"
            ],
        )

        return {
            "success": True,
            "data": {
                "location": {
                    **location_result,
                    "crime_dataset_district": district,
                },
                "safety": {
                    **prediction,
                    **risk,
                },
            },
        }

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Location safety prediction error.",
        )


# ============================================================
# CREATE SOS
# ============================================================


@app.post(
    "/api/v1/sos",
    status_code=status.HTTP_201_CREATED,
)
def create_sos(
    data: SOSRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create an SOS event and attempt emergency notifications.

    The SOS event is the primary operation.

    Notification failures must never prevent the
    emergency event from being recorded.
    """

    try:

        # ====================================================
        # 1. LOCATION
        # ====================================================

        latitude = float(data.latitude)
        longitude = float(data.longitude)

        if not -90 <= latitude <= 90:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid latitude.",
            )

        if not -180 <= longitude <= 180:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid longitude.",
            )

        # ====================================================
        # 2. DETERMINE DISTRICT
        # ====================================================

        district = None

        try:
            location_result = find_nearest_district(
                latitude=latitude,
                longitude=longitude,
            )

            district = get_crime_dataset_district(
                location_result["district"]
            )

        except Exception:
            district = None

        # ====================================================
        # 3. CALCULATE RISK
        # ====================================================

        risk_result = None

        if district:

            try:
                prediction = predict_district_risk(
                    district
                )

                risk = calculate_risk(
                    predicted_ipc=prediction[
                        "predicted_next_year_ipc"
                    ],
                    predicted_women_crime=prediction[
                        "predicted_next_year_women_crimes"
                    ],
                )

                risk_result = {
                    **prediction,
                    **risk,
                }

            except Exception:
                risk_result = None

        # ====================================================
        # 4. USE FRONTEND RISK ONLY AS FALLBACK
        # ====================================================

        risk_level = None
        risk_score = None
        predicted_ipc = None
        predicted_women_crimes = None

        if isinstance(
            risk_result,
            dict,
        ):

            risk_level = risk_result.get(
                "risk_level"
            )

            risk_score = risk_result.get(
                "risk_score"
            )

            predicted_ipc = risk_result.get(
                "predicted_next_year_ipc"
            )

            predicted_women_crimes = (
                risk_result.get(
                    "predicted_next_year_women_crimes"
                )
            )

        else:

            risk_level = data.risk_level
            risk_score = data.risk_score

        # ====================================================
        # 5. CREATE SOS EVENT
        # ====================================================

        sos_event = create_sos_event(
            db=db,
            user_id=current_user.id,
            latitude=latitude,
            longitude=longitude,
            risk_level=risk_level,
            risk_score=risk_score,
        )

        # ====================================================
        # 6. SEND EMAIL NOTIFICATIONS
        # ====================================================

        notification_results = []

        try:

            notification_results = (
                send_sos_notifications(
                    db=db,
                    sos_event=sos_event,
                    user_name=current_user.full_name,
                    district=district,
                    accuracy=None,
                    predicted_ipc=predicted_ipc,
                    predicted_women_crimes=(
                        predicted_women_crimes
                    ),
                )
            )

        except Exception:
            # The SOS event must remain active even
            # when notification delivery fails.
            notification_results = []

        # ====================================================
        # 7. RETURN RESPONSE
        # ====================================================

        return {
            "success": True,
            "message": (
                "SOS activated successfully."
            ),
            "data": {
                "sos_id": sos_event.id,
                "status": sos_event.status,
                "created_at": sos_event.created_at,

                "location": {
                    "latitude": sos_event.latitude,
                    "longitude": sos_event.longitude,
                    "district": district,
                },

                "risk": {
                    "level": sos_event.risk_level,
                    "score": sos_event.risk_score,
                    "predicted_ipc": predicted_ipc,
                    "predicted_women_crimes": (
                        predicted_women_crimes
                    ),
                },

                "notifications": (
                    notification_results
                ),
            },
        }

    except HTTPException:
        raise

    except ValueError as error:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )

    except Exception:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Unable to activate emergency SOS."
            ),
        )


# ============================================================
# GET SINGLE SOS
# ============================================================


@app.get("/api/v1/sos/{sos_id}")
def get_sos(
    sos_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    event = get_sos_event(
        db=db,
        user_id=current_user.id,
        sos_id=sos_id,
    )

    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SOS event not found.",
        )

    return {
        "success": True,
        "data": {
            "sos_id": event.id,
            "latitude": event.latitude,
            "longitude": event.longitude,
            "risk_level": event.risk_level,
            "risk_score": event.risk_score,
            "status": event.status,
            "created_at": event.created_at,
            "cancelled_at": event.cancelled_at,
        },
    }


# ============================================================
# CANCEL SOS
# ============================================================


@app.api_route(
    "/api/v1/sos/{sos_id}/cancel",
    methods=["POST", "PATCH"],
)
def cancel_sos(
    sos_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    event = cancel_sos_event(
        db=db,
        user_id=current_user.id,
        sos_id=sos_id,
    )

    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SOS event not found.",
        )

    return {
        "success": True,
        "message": "SOS cancelled.",
        "data": {
            "sos_id": event.id,
            "latitude": event.latitude,
            "longitude": event.longitude,
            "risk_level": event.risk_level,
            "risk_score": event.risk_score,
            "status": event.status,
            "created_at": event.created_at,
            "cancelled_at": event.cancelled_at,
        },
    }


# ============================================================
# GET CURRENT USER'S SOS HISTORY
# ============================================================


@app.get("/api/v1/sos")
def list_sos_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    events = get_user_sos_events(
        db=db,
        user_id=current_user.id,
    )

    return {
        "success": True,
        "data": [
            {
                "sos_id": event.id,
                "latitude": event.latitude,
                "longitude": event.longitude,
                "risk_level": event.risk_level,
                "risk_score": event.risk_score,
                "status": event.status,
                "created_at": event.created_at,
                "cancelled_at": event.cancelled_at,
            }
            for event in events
        ],
    }


# ============================================================
# ADD EMERGENCY CONTACT
# ============================================================


@app.post("/api/v1/contacts")
def create_contact(
    contact: EmergencyContactRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    try:

        new_contact = add_emergency_contact(
            db=db,
            user_id=current_user.id,
            name=contact.name,
            phone=contact.phone,
            email=(
                str(contact.email)
                if contact.email
                else None
            ),
            relationship=contact.relationship,
        )

        return {
            "success": True,
            "message": "Emergency contact added.",
            "data": {
                "id": new_contact.id,
                "contact_id": new_contact.id,
                "name": new_contact.name,
                "phone": new_contact.phone,
                "email": new_contact.email,
                "relationship": new_contact.relationship,
                "created_at": new_contact.created_at,
            },
        }

    except ValueError as error:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )

    except Exception:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to add emergency contact.",
        )


# ============================================================
# GET ALL EMERGENCY CONTACTS
# ============================================================


@app.get("/api/v1/contacts")
def list_contacts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    contacts = get_emergency_contacts(
        db=db,
        user_id=current_user.id,
    )

    return {
        "success": True,
        "data": [
            {
                "id": contact.id,
                "contact_id": contact.id,
                "name": contact.name,
                "phone": contact.phone,
                "email": contact.email,
                "relationship": contact.relationship,
                "created_at": contact.created_at,
            }
            for contact in contacts
        ],
    }


# ============================================================
# GET SINGLE EMERGENCY CONTACT
# ============================================================


@app.get("/api/v1/contacts/{contact_id}")
def get_contact(
    contact_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    contact = get_emergency_contact(
        db=db,
        user_id=current_user.id,
        contact_id=contact_id,
    )

    if contact is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency contact not found.",
        )

    return {
        "success": True,
        "data": {
            "id": contact.id,
            "contact_id": contact.id,
            "name": contact.name,
            "phone": contact.phone,
            "email": contact.email,
            "relationship": contact.relationship,
            "created_at": contact.created_at,
        },
    }


# ============================================================
# DELETE EMERGENCY CONTACT
# ============================================================


@app.delete("/api/v1/contacts/{contact_id}")
def delete_contact(
    contact_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    contact = get_emergency_contact(
        db=db,
        user_id=current_user.id,
        contact_id=contact_id,
    )

    if contact is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency contact not found.",
        )

    deleted_name = contact.name
    deleted_id = contact.id

    success = delete_emergency_contact(
        db=db,
        user_id=current_user.id,
        contact_id=contact_id,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency contact not found.",
        )

    return {
        "success": True,
        "message": "Emergency contact deleted.",
        "data": {
            "id": deleted_id,
            "contact_id": deleted_id,
            "name": deleted_name,
        },
    }