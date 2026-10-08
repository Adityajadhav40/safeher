from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.sos import SOSEvent


# ============================================================
# VALIDATION
# ============================================================

def _validate_location(
    latitude: float,
    longitude: float,
) -> None:

    if not -90 <= latitude <= 90:
        raise ValueError("Invalid latitude.")

    if not -180 <= longitude <= 180:
        raise ValueError("Invalid longitude.")


def _validate_risk(
    risk_level: str | None,
    risk_score: float | None,
) -> tuple[str | None, float | None]:

    if risk_level is not None:
        risk_level = risk_level.strip().upper()

        allowed_levels = {
            "LOW",
            "MODERATE",
            "HIGH",
            "CRITICAL",
        }

        if risk_level not in allowed_levels:
            raise ValueError("Invalid risk level.")

    if risk_score is not None:
        if not 0 <= risk_score <= 100:
            raise ValueError(
                "Risk score must be between 0 and 100."
            )

    return risk_level, risk_score


# ============================================================
# CREATE SOS EVENT
# ============================================================

def create_sos_event(
    db: Session,
    user_id: str,
    latitude: float,
    longitude: float,
    risk_level: str | None = None,
    risk_score: float | None = None,
) -> SOSEvent:

    _validate_location(
        latitude=latitude,
        longitude=longitude,
    )

    risk_level, risk_score = _validate_risk(
        risk_level=risk_level,
        risk_score=risk_score,
    )

    event = SOSEvent(
        user_id=user_id,
        latitude=latitude,
        longitude=longitude,
        risk_level=risk_level,
        risk_score=risk_score,
        status="ACTIVE",
    )

    db.add(event)

    try:
        db.commit()
        db.refresh(event)

    except Exception:
        db.rollback()
        raise

    return event


# ============================================================
# GET SOS EVENT
# ============================================================

def get_sos_event(
    db: Session,
    user_id: str,
    sos_id: str,
) -> SOSEvent | None:

    statement = (
        select(SOSEvent)
        .where(
            SOSEvent.id == sos_id,
            SOSEvent.user_id == user_id,
        )
    )

    return (
        db.execute(statement)
        .scalar_one_or_none()
    )


# ============================================================
# CANCEL SOS EVENT
# ============================================================

def cancel_sos_event(
    db: Session,
    user_id: str,
    sos_id: str,
) -> SOSEvent | None:

    event = get_sos_event(
        db=db,
        user_id=user_id,
        sos_id=sos_id,
    )

    if event is None:
        return None

    if event.status == "CANCELLED":
        return event

    event.status = "CANCELLED"
    event.cancelled_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(event)

    except Exception:
        db.rollback()
        raise

    return event


# ============================================================
# GET USER'S SOS EVENTS
# ============================================================

def get_user_sos_events(
    db: Session,
    user_id: str,
) -> list[SOSEvent]:

    statement = (
        select(SOSEvent)
        .where(
            SOSEvent.user_id == user_id,
        )
        .order_by(
            SOSEvent.created_at.desc()
        )
    )

    return list(
        db.execute(statement)
        .scalars()
        .all()
    )