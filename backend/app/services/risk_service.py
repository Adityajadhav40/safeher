from pathlib import Path

import numpy as np
import pandas as pd


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

DATA_PATH = (
    BASE_DIR
    / "data"
    / "maharashtra_risk_modeling_2002_2013.csv"
)


# ============================================================
# LOAD HISTORICAL DATA
# ============================================================

crime_data = pd.read_csv(DATA_PATH)


# ============================================================
# HISTORICAL DISTRIBUTIONS
# ============================================================

IPC_VALUES = (
    crime_data["TOTAL IPC CRIMES"]
    .dropna()
    .astype(float)
    .values
)

WOMEN_CRIME_VALUES = (
    crime_data["WOMEN_CRIME_TOTAL"]
    .dropna()
    .astype(float)
    .values
)


# ============================================================
# PERCENTILE FUNCTION
# ============================================================

def percentile_rank(
    value: float,
    historical_values: np.ndarray
) -> float:

    rank = (
        np.sum(
            historical_values <= value
        )
        / len(historical_values)
    ) * 100

    return float(rank)


# ============================================================
# RISK LEVEL
# ============================================================

def get_risk_level(
    score: float
) -> str:

    if score < 25:
        return "LOW"

    if score < 50:
        return "MODERATE"

    if score < 75:
        return "HIGH"

    return "CRITICAL"


# ============================================================
# RISK REASON
# ============================================================

def get_risk_reason(
    ipc_percentile: float,
    women_percentile: float
) -> str:

    if (
        ipc_percentile >= 75
        and women_percentile >= 75
    ):
        return (
            "Both overall crime and women-related "
            "crime are at high historical levels."
        )

    if ipc_percentile >= 75:
        return (
            "Overall crime is at a high historical "
            "level for Maharashtra districts."
        )

    if women_percentile >= 75:
        return (
            "Women-related crime is at a high "
            "historical level."
        )

    if (
        ipc_percentile >= 50
        or women_percentile >= 50
    ):
        return (
            "Crime indicators are above the "
            "lower half of historical district levels."
        )

    return (
        "Crime indicators are within the lower "
        "half of historical district levels."
    )


# ============================================================
# COMPLETE RISK CALCULATION
# ============================================================

def calculate_risk(
    predicted_ipc: float,
    predicted_women_crime: float
) -> dict:

    # --------------------------------------------------------
    # Calculate historical percentiles
    # --------------------------------------------------------

    ipc_percentile = percentile_rank(
        predicted_ipc,
        IPC_VALUES
    )

    women_percentile = percentile_rank(
        predicted_women_crime,
        WOMEN_CRIME_VALUES
    )

    # --------------------------------------------------------
    # Calculate weighted risk score
    #
    # Overall IPC crime      = 60%
    # Women-related crime    = 40%
    #
    # These are application-policy weights.
    # They are NOT ML outputs.
    # --------------------------------------------------------

    risk_score = (
        0.60 * ipc_percentile
        +
        0.40 * women_percentile
    )

    # Keep score between 0 and 100
    risk_score = float(
        np.clip(
            risk_score,
            0,
            100
        )
    )

    # --------------------------------------------------------
    # Convert score to risk category
    # --------------------------------------------------------

    risk_level = get_risk_level(
        risk_score
    )

    # --------------------------------------------------------
    # Generate explanation
    # --------------------------------------------------------

    risk_reason = get_risk_reason(
        ipc_percentile,
        women_percentile
    )

    # --------------------------------------------------------
    # Return API-friendly result
    # --------------------------------------------------------

    return {
        "risk_score": round(
            risk_score,
            2
        ),

        "risk_level": risk_level,

        "ipc_percentile": round(
            ipc_percentile,
            2
        ),

        "women_crime_percentile": round(
            women_percentile,
            2
        ),

        "risk_reason": risk_reason
    }