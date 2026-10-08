import os
from pathlib import Path

import resend
from dotenv import load_dotenv


# Always load the project's backend/.env explicitly.
BASE_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BASE_DIR / ".env"

load_dotenv(
    ENV_FILE,
    override=True,
)


RESEND_ENABLED = (
    os.getenv(
        "RESEND_ENABLED",
        "false",
    )
    .strip()
    .lower()
    == "true"
)

RESEND_API_KEY = os.getenv(
    "RESEND_API_KEY",
    "",
).strip()

RESEND_FROM_EMAIL = os.getenv(
    "RESEND_FROM_EMAIL",
    "",
).strip()


def is_resend_configured() -> bool:
    return bool(
        RESEND_ENABLED
        and RESEND_API_KEY
        and RESEND_FROM_EMAIL
    )


def validate_resend_configuration() -> None:
    if not RESEND_ENABLED:
        raise RuntimeError(
            "Resend email notifications are disabled."
        )

    if not RESEND_API_KEY:
        raise RuntimeError(
            "RESEND_API_KEY is not configured."
        )

    if not RESEND_FROM_EMAIL:
        raise RuntimeError(
            "RESEND_FROM_EMAIL is not configured."
        )


def send_sos_email(
    recipient: str,
    subject: str,
    message: str,
) -> dict:
    validate_resend_configuration()

    recipient = recipient.strip()

    if not recipient:
        raise ValueError(
            "Email recipient is required."
        )

    resend.api_key = RESEND_API_KEY

    params = {
        "from": RESEND_FROM_EMAIL,
        "to": [recipient],
        "subject": subject,
        "text": message,
    }

    try:
        response = resend.Emails.send(params)
    except Exception as error:
        raise RuntimeError(
            "Unable to send email notification."
        ) from error

    message_id = None

    if isinstance(response, dict):
        message_id = response.get("id")
    else:
        message_id = getattr(
            response,
            "id",
            None,
        )

    return {
        "success": True,
        "provider": "RESEND",
        "provider_message_id": (
            str(message_id)
            if message_id
            else None
        ),
    }