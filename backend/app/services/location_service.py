from math import radians, sin, cos, sqrt, atan2


# ============================================================
# DISTRICT REFERENCE POINTS
# ============================================================

DISTRICT_COORDINATES = {

    "AHMEDNAGAR": (19.0948, 74.7480),
    "AKOLA": (20.7002, 77.0082),
    "AMRAVATI": (20.9374, 77.7796),
    "AURANGABAD": (19.8762, 75.3433),
    "BEED": (18.9891, 75.7601),
    "BHANDARA": (21.1700, 79.6500),
    "BULDHANA": (20.5293, 76.1842),
    "CHANDRAPUR": (19.9707, 79.3031),
    "DHULE": (20.9042, 74.7749),
    "GADCHIROLI": (20.1809, 80.0060),
    "GONDIA": (21.4624, 80.2210),
    "HINGOLI": (19.7190, 77.1490),
    "JALGAON": (21.0077, 75.5626),
    "JALNA": (19.8347, 75.8816),
    "KOLHAPUR": (16.7050, 74.2433),
    "LATUR": (18.4088, 76.5604),
    "NAGPUR": (21.1458, 79.0882),
    "NANDED": (19.1383, 77.3210),
    "NANDURBAR": (21.3660, 74.2400),
    "NASHIK": (19.9975, 73.7898),
    "OSMANABAD": (18.1860, 76.0419),
    "PALGHAR": (19.6967, 72.7653),
    "PARBHANI": (19.2608, 76.7767),
    "PUNE": (18.5204, 73.8567),
    "RAIGAD": (18.5200, 73.0000),
    "RATNAGIRI": (16.9902, 73.3120),
    "SANGLI": (16.8524, 74.5815),
    "SATARA": (17.6805, 74.0183),
    "SINDHUDURG": (16.3492, 73.5594),
    "SOLAPUR": (17.6599, 75.9064),
    "THANE": (19.2183, 72.9781),
    "WARDHA": (20.7453, 78.6022),
    "WASHIM": (20.1110, 77.1310),
    "YAVATMAL": (20.3888, 78.1204),

    "MUMBAI": (19.0760, 72.8777),
}


# ============================================================
# LOCATION DISTRICT → CRIME DATASET DISTRICT
# ============================================================

DISTRICT_CRIME_MAPPING = {

    "PUNE": "PUNE COMMR.",

    "MUMBAI": "MUMBAI COMMR.",

    "NAGPUR": "NAGPUR COMMR.",

    "THANE": "THANE COMMR.",

    "NASHIK": "NASIK COMMR.",
}


# ============================================================
# HAVERSINE DISTANCE
# ============================================================

def calculate_distance(
    latitude_1: float,
    longitude_1: float,
    latitude_2: float,
    longitude_2: float
) -> float:

    earth_radius_km = 6371.0

    lat1 = radians(latitude_1)
    lon1 = radians(longitude_1)

    lat2 = radians(latitude_2)
    lon2 = radians(longitude_2)

    delta_lat = lat2 - lat1
    delta_lon = lon2 - lon1

    a = (
        sin(delta_lat / 2) ** 2
        + cos(lat1)
        * cos(lat2)
        * sin(delta_lon / 2) ** 2
    )

    c = 2 * atan2(
        sqrt(a),
        sqrt(1 - a)
    )

    return earth_radius_km * c


# ============================================================
# FIND NEAREST DISTRICT
# ============================================================

def find_nearest_district(
    latitude: float,
    longitude: float
) -> dict:

    if not -90 <= latitude <= 90:
        raise ValueError(
            "Invalid latitude."
        )

    if not -180 <= longitude <= 180:
        raise ValueError(
            "Invalid longitude."
        )

    nearest_district = None
    nearest_distance = float("inf")

    for district, coordinates in DISTRICT_COORDINATES.items():

        distance = calculate_distance(
            latitude,
            longitude,
            coordinates[0],
            coordinates[1]
        )

        if distance < nearest_distance:

            nearest_distance = distance
            nearest_district = district

    if nearest_district is None:

        raise ValueError(
            "Unable to determine district."
        )

    return {
        "district": nearest_district,
        "distance_km": round(
            nearest_distance,
            2
        ),
        "latitude": latitude,
        "longitude": longitude
    }


# ============================================================
# GET CRIME DATASET DISTRICT
# ============================================================

def get_crime_dataset_district(
    district: str
) -> str:

    district = district.strip().upper()

    return DISTRICT_CRIME_MAPPING.get(
        district,
        district
    )