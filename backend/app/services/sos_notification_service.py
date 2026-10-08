from datetime import datetime, timezone

from sqlalchemy.orm import Session

from backend.app.models.sos import SOSEvent
from backend.app.services.notification_service import (
    build_location_url,
    create_notification_record,
    get_user_emergency_contacts,
    mark_notification_failed,
    mark_notification_sent,
)
from backend.app.services.resend_service import (
    is_resend_configured,
    send_sos_email,
)


def _format_sos_time(
    created_at: datetime | None,
) -> str:
    if created_at is None:
        created_at = datetime.now(timezone.utc)

    if created_at.tzinfo is None:
        created_at = created_at.replace(
            tzinfo=timezone.utc
        )

    return created_at.astimezone().strftime(
        "%d %B %Y, %I:%M %p"
    )


def _build_sos_email_subject(
    risk_level: str,
) -> str:
    return (
        f"🚨 SAFEHER SOS ALERT — "
        f"{risk_level} RISK"
    )


def _build_sos_email_message(
    user_name: str,
    district: str | None,
    risk_level: str,
    risk_score: float,
    latitude: float,
    longitude: float,
    accuracy: float | None,
    predicted_ipc: float | None,
    predicted_women_crimes: float | None,
    created_at: datetime | None,
) -> str:
    location_url = build_location_url(
        latitude,
        longitude,
    )

    time_text = _format_sos_time(
        created_at
    )

    district_text = (
        district
        if district
        else "Location district unavailable"
    )

    accuracy_text = (
        f"{accuracy:.1f} meters"
        if accuracy is not None
        else "Not available"
    )

    ipc_text = (
        f"{predicted_ipc:.2f}"
        if predicted_ipc is not None
        else "Not available"
    )

    women_text = (
        f"{predicted_women_crimes:.2f}"
        if predicted_women_crimes is not None
        else "Not available"
    )

    return f"""
🚨 SAFEHER SOS ALERT

EMERGENCY ASSISTANCE REQUIRED

{user_name} has activated an SOS through SafeHer.

----------------------------------------
EMERGENCY DETAILS
----------------------------------------

Time:
{time_text}

Detected District:
{district_text}

Risk Level:
{risk_level}

Risk Score:
{risk_score:.2f}

----------------------------------------
LOCATION
----------------------------------------

Latitude:
{latitude:.6f}

Longitude:
{longitude:.6f}

GPS Accuracy:
{accuracy_text}

Open Location in Google Maps:
{location_url}

----------------------------------------
SAFETY ANALYSIS
----------------------------------------

Predicted IPC Crime:
{ipc_text}

Predicted Women-Related Crime:
{women_text}

----------------------------------------

Please contact the user immediately.

If the situation appears dangerous or
the user cannot be reached, contact
the appropriate emergency services.

This emergency notification was generated
automatically by SafeHer.

Do not reply to this email.
""".strip()


def send_sos_notifications(
    db: Session,
    sos_event: SOSEvent,
    user_name: str,
    district: str | None = None,
    accuracy: float | None = None,
    predicted_ipc: float | None = None,
    predicted_women_crimes: float | None = None,
) -> list:

    contacts = get_user_emergency_contacts(
        db=db,
        user_id=sos_event.user_id,
    )

    results = []

    # No contacts means there is nothing to notify.
    if not contacts:
        return results

    # Resend is intentionally checked once before
    # processing contacts.
    resend_configured = (
        is_resend_configured()
    )

    for contact in contacts:

        # Contacts without an email address are skipped.
        if not contact.email:
            continue

        email_address = str(
            contact.email
        ).strip()

        if not email_address:
            continue

        notification = create_notification_record(
            db=db,
            sos_id=sos_event.id,
            user_id=sos_event.user_id,
            channel="EMAIL",
            recipient=email_address,
        )

        if not resend_configured:

            mark_notification_failed(
                db=db,
                notification_id=notification.id,
                provider="RESEND",
                error_message=(
                    "Resend is not configured. "
                    "Email notification was not sent."
                ),
            )

            results.append({
                "notification_id": notification.id,
                "channel": "EMAIL",
                "recipient": email_address,
                "status": "FAILED",
                "provider": "RESEND",
                "reason": (
                    "Email provider not configured."
                ),
            })

            continue

        subject = _build_sos_email_subject(
            risk_level=sos_event.risk_level,
        )

        message = _build_sos_email_message(
            user_name=user_name,
            district=district,
            risk_level=sos_event.risk_level,
            risk_score=sos_event.risk_score,
            latitude=sos_event.latitude,
            longitude=sos_event.longitude,
            accuracy=accuracy,
            predicted_ipc=predicted_ipc,
            predicted_women_crimes=(
                predicted_women_crimes
            ),
            created_at=sos_event.created_at,
        )

        try:

            email_result = send_sos_email(
                recipient=email_address,
                subject=subject,
                message=message,
            )

            if email_result.get("success"):

                sent_notification = (
                    mark_notification_sent(
                        db=db,
                        notification_id=notification.id,
                        provider="RESEND",
                        provider_message_id=(
                            email_result.get(
                                "provider_message_id"
                            )
                        ),
                    )
                )

                results.append({
                    "notification_id": (
                        sent_notification.id
                        if sent_notification
                        else notification.id
                    ),
                    "channel": "EMAIL",
                    "recipient": email_address,
                    "status": "SENT",
                    "provider": "RESEND",
                    "provider_message_id": (
                        email_result.get(
                            "provider_message_id"
                        )
                    ),
                })

            else:

                failed_notification = (
                    mark_notification_failed(
                        db=db,
                        notification_id=notification.id,
                        provider="RESEND",
                        error_message=(
                            "Resend did not confirm "
                            "successful email submission."
                        ),
                    )
                )

                results.append({
                    "notification_id": (
                        failed_notification.id
                        if failed_notification
                        else notification.id
                    ),
                    "channel": "EMAIL",
                    "recipient": email_address,
                    "status": "FAILED",
                    "provider": "RESEND",
                })

        except Exception as error:

            mark_notification_failed(
                db=db,
                notification_id=notification.id,
                provider="RESEND",
                error_message=str(error),
            )

            results.append({
                "notification_id": notification.id,
                "channel": "EMAIL",
                "recipient": email_address,
                "status": "FAILED",
                "provider": "RESEND",
                "reason": (
                    "Email provider error."
                ),
            })

    return results