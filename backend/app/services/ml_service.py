from pathlib import Path

import joblib
import numpy as np
import pandas as pd


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

MODEL_DIR = BASE_DIR.parent / "ml" / "models"

DATA_DIR = BASE_DIR / "data"


IPC_MODEL_PATH = (
    MODEL_DIR /
    "maharashtra_ipc_growth_model.joblib"
)

WOMEN_MODEL_PATH = (
    MODEL_DIR /
    "maharashtra_women_crime_model.joblib"
)

DATA_PATH = (
    DATA_DIR /
    "maharashtra_risk_modeling_2002_2013.csv"
)


# ============================================================
# LOAD MODELS
# ============================================================

print("Loading ML models...")

ipc_model = joblib.load(
    IPC_MODEL_PATH
)

women_model = joblib.load(
    WOMEN_MODEL_PATH
)

print("IPC model loaded.")
print("Women-crime model loaded.")


# ============================================================
# LOAD HISTORICAL DATA
# ============================================================

crime_data = pd.read_csv(
    DATA_PATH
)

crime_data["District"] = (
    crime_data["District"]
    .astype(str)
    .str.strip()
    .str.upper()
)


# ============================================================
# FEATURE DEFINITIONS
# ============================================================

TARGET_IPC = "TARGET_NEXT_YEAR_IPC"

TARGET_WOMEN = "TARGET_NEXT_YEAR_WOMEN_CRIME"


FEATURE_COLUMNS = [
    column
    for column in crime_data.columns
    if column not in [
        "State_UT",
        TARGET_IPC,
        TARGET_WOMEN
    ]
]


# ============================================================
# DISTRICT LOOKUP
# ============================================================

def get_latest_district_record(
    district: str
) -> pd.DataFrame:

    district = (
        district
        .strip()
        .upper()
    )

    district_data = crime_data[
        crime_data["District"] == district
    ].copy()

    if district_data.empty:
        raise ValueError(
            f"District '{district}' not found."
        )

    latest_year = district_data["Year"].max()

    latest_record = district_data[
        district_data["Year"] == latest_year
    ].copy()

    return latest_record


# ============================================================
# IPC PREDICTION
# ============================================================

def predict_ipc(
    record: pd.DataFrame
) -> float:

    features = record[
        FEATURE_COLUMNS
    ]

    predicted_growth = ipc_model.predict(
        features
    )[0]

    current_ipc = float(
        record["TOTAL IPC CRIMES"].iloc[0]
    )

    predicted_ipc = (
        (current_ipc + 1)
        * np.exp(predicted_growth)
        - 1
    )

    return max(
        0.0,
        float(predicted_ipc)
    )


# ============================================================
# WOMEN CRIME PREDICTION
# ============================================================

def predict_women_crime(
    record: pd.DataFrame
) -> float:

    features = record[
        FEATURE_COLUMNS
    ]

    prediction = women_model.predict(
        features
    )[0]

    return max(
        0.0,
        float(prediction)
    )


# ============================================================
# COMPLETE DISTRICT PREDICTION
# ============================================================

def predict_district_risk(
    district: str
) -> dict:

    record = get_latest_district_record(
        district
    )

    latest_year = int(
        record["Year"].iloc[0]
    )

    current_ipc = float(
        record["TOTAL IPC CRIMES"].iloc[0]
    )

    current_women_crime = float(
        record["WOMEN_CRIME_TOTAL"].iloc[0]
    )

    predicted_ipc = predict_ipc(
        record
    )

    predicted_women_crime = predict_women_crime(
        record
    )

    return {
        "district": district.strip().upper(),
        "reference_year": latest_year,
        "current_ipc_crimes": current_ipc,
        "current_women_crimes": current_women_crime,
        "predicted_next_year_ipc": round(
            predicted_ipc,
            2
        ),
        "predicted_next_year_women_crimes": round(
            predicted_women_crime,
            2
        )
    }