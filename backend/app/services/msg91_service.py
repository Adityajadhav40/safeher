import json
import os
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from dotenv import load_dotenv


# ============================================================
# CONFIGURATION
# ============================================================

load_dotenv()

MSG91_ENABLED = (
    os.getenv(
        "MSG91_ENABLED",
        "false",
    ).strip().lower()
    == "true"
)

MSG91_AUTH_KEY = os.getenv(
    "MSG91_AUTH_KEY",
    "",
).strip()

MSG91_SMS_TEMPLATE_ID = os.getenv(
    "MSG91_SMS_TEMPLATE_ID",
    "",
).strip()

MSG91_SMS_SENDER_ID = os.getenv(
    "MSG91_SMS_SENDER_ID",
    "",
).strip()

MSG91_API_URL = (
    "https://control.msg91.com/api/v5/flow"
)


# ============================================================
# PHONE NUMBER
# ============================================================

def normalize_indian_phone(
    phone: str,
) -> str:

    if not phone:
        raise ValueError(
            "Phone number is required."
        )

    digits = re.sub(
        r"\D",
        "",
        phone,
    )

    if digits.startswith("91") and len(digits) == 12:
        return digits

    if len(digits) == 10:
        return f"91{digits}"

    raise ValueError(
        "Invalid Indian mobile number."
    )


# ============================================================
# CONFIGURATION VALIDATION
# ============================================================

def is_msg91_configured() -> bool:

    return bool(
        MSG91_ENABLED
        and MSG91_AUTH_KEY
        and MSG91_SMS_TEMPLATE_ID
    )


def validate_msg91_configuration() -> None:

    if not MSG91_ENABLED:
        raise RuntimeError(
            "MSG91 SMS notifications are disabled."
        )

    if not MSG91_AUTH_KEY:
        raise RuntimeError(
            "MSG91_AUTH_KEY is not configured."
        )

    if not MSG91_SMS_TEMPLATE_ID:
        raise RuntimeError(
            "MSG91_SMS_TEMPLATE_ID is not configured."
        )


# ============================================================
# SEND SMS
# ============================================================

def send_sos_sms(
    phone: str,
    user_name: str,
    district: str | None,
    risk_level: str | None,
    risk_score: float | None,
    latitude: float,
    longitude: float,
) -> dict:

    validate_msg91_configuration()

    mobile_number = normalize_indian_phone(
        phone
    )

    risk_text = (
        f"{risk_level} "
        f"({risk_score:.1f}/100)"
        if risk_level is not None
        and risk_score is not None
        else "UNKNOWN"
    )

    district_text = (
        district or "Unknown"
    )

    location_url = (
        "https://www.google.com/maps/search/"
        f"?api=1&query={latitude},{longitude}"
    )


    # --------------------------------------------------------
    # MSG91 FLOW REQUEST
    # --------------------------------------------------------

    payload = {
        "template_id":
            MSG91_SMS_TEMPLATE_ID,

        "short_url": "0",

        "realTimeResponse": "1",

        "recipients": [
            {
                "mobiles": mobile_number,

                "VAR1": user_name,

                "VAR2": district_text,

                "VAR3": risk_text,

                "VAR4":
                    f"{latitude:.6f}, "
                    f"{longitude:.6f}",

                "VAR5": location_url,
            }
        ],
    }


    request = Request(
        MSG91_API_URL,
        data=json.dumps(
            payload
        ).encode("utf-8"),

        headers={
            "accept":
                "application/json",

            "authkey":
                MSG91_AUTH_KEY,

            "content-type":
                "application/json",
        },

        method="POST",
    )


    # --------------------------------------------------------
    # API CALL
    # --------------------------------------------------------

    try:

        with urlopen(
            request,
            timeout=15,
        ) as response:

            raw_response = (
                response
                .read()
                .decode("utf-8")
            )

            status_code = (
                response.status
            )


    except HTTPError as error:

        error_body = ""

        try:
            error_body = (
                error
                .read()
                .decode("utf-8")
            )
        except Exception:
            pass

        raise RuntimeError(
            "MSG91 SMS request failed "
            f"with HTTP {error.code}: "
            f"{error_body[:500]}"
        )


    except URLError as error:

        raise RuntimeError(
            "Unable to connect to MSG91: "
            f"{error.reason}"
        )


    except TimeoutError:

        raise RuntimeError(
            "MSG91 SMS request timed out."
        )


    except Exception as error:

        raise RuntimeError(
            "Unexpected MSG91 error: "
            f"{str(error)}"
        )


    # --------------------------------------------------------
    # PARSE RESPONSE
    # --------------------------------------------------------

    try:
        response_data = json.loads(
            raw_response
        )

    except json.JSONDecodeError:

        response_data = {
            "raw_response":
                raw_response
        }


    return {
        "success":
            200 <= status_code < 300,

        "status_code":
            status_code,

        "provider":
            "MSG91",

        "provider_message_id":
            extract_message_id(
                response_data
            ),

        "response":
            response_data,
    }


# ============================================================
# MESSAGE ID
# ============================================================

def extract_message_id(
    response_data: dict,
) -> str | None:

    if not isinstance(
        response_data,
        dict,
    ):
        return None


    possible_keys = [
        "request_id",
        "requestId",
        "message_id",
        "messageId",
        "id",
    ]


    for key in possible_keys:

        value = response_data.get(
            key
        )

        if value:
            return str(value)


    return None