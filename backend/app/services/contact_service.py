from sqlalchemy.orm import Session

from backend.app.models.contact import EmergencyContact
from backend.app.schemas.contact import ContactCreate


def add_emergency_contact(
    db: Session,
    user_id: str,
    contact_data: ContactCreate | None = None,
    name: str | None = None,
    phone: str | None = None,
    relationship: str | None = None,
    email: str | None = None,
) -> EmergencyContact:
    """
    Create an emergency contact.

    Supports both:
    1. Passing a ContactCreate / EmergencyContactRequest object.
    2. Passing contact fields directly.
    """

    if contact_data is not None:
        name = contact_data.name
        phone = contact_data.phone
        relationship = contact_data.relationship
        email = (
            str(contact_data.email)
            if contact_data.email
            else None
        )

    if not name or not name.strip():
        raise ValueError("Contact name is required.")

    if not phone or not phone.strip():
        raise ValueError(
            "Contact phone number is required."
        )

    if not relationship or not relationship.strip():
        raise ValueError(
            "Contact relationship is required."
        )

    cleaned_email = None

    if email:
        cleaned_email = str(email).strip()

    contact = EmergencyContact(
        user_id=user_id,
        name=name.strip(),
        phone=phone.strip(),
        email=cleaned_email,
        relationship=relationship.strip(),
    )

    db.add(contact)

    try:
        db.commit()
        db.refresh(contact)
    except Exception:
        db.rollback()
        raise

    return contact


def get_emergency_contacts(
    db: Session,
    user_id: str,
) -> list[EmergencyContact]:
    """
    Return all emergency contacts belonging
    to the authenticated user.
    """

    return (
        db.query(EmergencyContact)
        .filter(
            EmergencyContact.user_id == user_id
        )
        .order_by(
            EmergencyContact.created_at.asc()
        )
        .all()
    )


def get_emergency_contact(
    db: Session,
    contact_id: str,
    user_id: str,
) -> EmergencyContact | None:
    """
    Return one emergency contact belonging
    to the authenticated user.

    Returns:
        EmergencyContact | None
    """

    contact = (
        db.query(EmergencyContact)
        .filter(
            EmergencyContact.id == contact_id,
            EmergencyContact.user_id == user_id,
        )
        .first()
    )

    return contact


def delete_emergency_contact(
    db: Session,
    contact_id: str,
    user_id: str,
) -> bool:
    """
    Delete one emergency contact belonging
    to the authenticated user.

    Returns:
        True  -> deleted successfully
        False -> contact was not found
    """

    contact = get_emergency_contact(
        db=db,
        contact_id=contact_id,
        user_id=user_id,
    )

    if contact is None:
        return False

    db.delete(contact)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    return True


# ============================================================
# COMPATIBILITY ALIASES
# ============================================================

create_contact = add_emergency_contact

get_user_contacts = get_emergency_contacts

get_contact = get_emergency_contact

delete_contact = delete_emergency_contact