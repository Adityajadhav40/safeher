import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import L from "leaflet";

import {
    getLocationSafety,
} from "../services/api";

import "leaflet/dist/leaflet.css";
import "./SafetyMap.css";


/* =========================================================
   HELPERS
========================================================= */

const toNumber = (value) => {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : null;
};


const getReadableError = (error) => {
    if (!error) {
        return "Unable to update the safety assessment.";
    }

    if (typeof error === "string") {
        return error;
    }

    const detail =
        error?.response?.data?.detail;

    if (Array.isArray(detail)) {
        return detail
            .map((item) => {
                if (typeof item === "string") {
                    return item;
                }

                return (
                    item?.msg ||
                    "Invalid request."
                );
            })
            .join(" ");
    }

    if (typeof detail === "string") {
        return detail;
    }

    if (error?.message) {
        return error.message;
    }

    return "Unable to update the safety assessment.";
};


const normalizeSafetyResponse = (
    response,
    fallbackLocation
) => {
    const root =
        response?.data &&
        typeof response.data === "object"
            ? response.data
            : response || {};

    const location =
        root.location ||
        root.data?.location ||
        {};

    const safety =
        root.safety ||
        root.data?.safety ||
        root.risk ||
        {};

    const predictions =
        root.predictions ||
        root.data?.predictions ||
        {};

    const latitude =
        toNumber(
            location.latitude ??
            root.latitude ??
            fallbackLocation?.latitude
        );

    const longitude =
        toNumber(
            location.longitude ??
            root.longitude ??
            fallbackLocation?.longitude
        );

    const accuracy =
        toNumber(
            location.accuracy ??
            root.accuracy ??
            fallbackLocation?.accuracy
        );

    const district =
        location.district ||
        root.district ||
        safety.district ||
        "Unknown";

    const riskLevel =
        safety.risk_level ||
        safety.riskLevel ||
        root.risk_level ||
        root.riskLevel ||
        "UNKNOWN";

    const riskScore =
        toNumber(
            safety.risk_score ??
            safety.riskScore ??
            root.risk_score ??
            root.riskScore
        );

    const ipcPrediction =
        toNumber(
            predictions.ipc ??
            predictions.ipc_prediction ??
            predictions.predicted_ipc ??
            safety.predicted_ipc ??
            safety.ipc_prediction ??
            root.predicted_ipc
        );

    const womenCrimePrediction =
        toNumber(
            predictions.women_crime ??
            predictions.women_crime_prediction ??
            predictions.predicted_women_crime ??
            safety.predicted_women_crime ??
            safety.women_crime_prediction ??
            root.predicted_women_crime
        );

    const reasons =
        safety.reasons ||
        root.reasons ||
        [];

    return {
        latitude,
        longitude,
        accuracy,
        district,
        riskLevel,
        riskScore,
        ipcPrediction,
        womenCrimePrediction,
        reasons: Array.isArray(reasons)
            ? reasons
            : [],
        raw: response,
    };
};


const getRiskClass = (riskLevel) => {
    const level =
        String(riskLevel || "")
            .toLowerCase();

    if (level === "low") {
        return "risk-low";
    }

    if (level === "moderate") {
        return "risk-moderate";
    }

    if (level === "high") {
        return "risk-high";
    }

    if (level === "critical") {
        return "risk-critical";
    }

    return "risk-unknown";
};


const formatNumber = (
    value,
    decimals = 0
) => {
    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(Number(value))
    ) {
        return "--";
    }

    return Number(value).toLocaleString(
        "en-IN",
        {
            maximumFractionDigits: decimals,
        }
    );
};


const formatRiskScore = (value) => {
    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(Number(value))
    ) {
        return "--";
    }

    return Number(value).toFixed(2);
};


/* =========================================================
   SAFETY MAP
========================================================= */

function SafetyMap() {
    const navigate = useNavigate();

    const mapContainerRef =
        useRef(null);

    const mapRef =
        useRef(null);

    const markerRef =
        useRef(null);

    const accuracyCircleRef =
        useRef(null);

    const locationRequestRef =
        useRef(false);

    const [locationData, setLocationData] =
        useState(null);

    const [safetyData, setSafetyData] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const [gpsStatus, setGpsStatus] =
        useState("connecting");

    const [error, setError] =
        useState("");


    /* =====================================================
       MAP INITIALIZATION
    ===================================================== */

    useEffect(() => {
        if (
            !mapContainerRef.current ||
            mapRef.current
        ) {
            return;
        }


        const map = L.map(
            mapContainerRef.current,
            {
                center: [
                    19.7515,
                    75.7139,
                ],
                zoom: 7,
                zoomControl: true,
                attributionControl: true,
            }
        );


        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                maxZoom: 19,
                attribution:
                    "&copy; OpenStreetMap contributors",
            }
        ).addTo(map);


        mapRef.current = map;


        /*
         * Leaflet needs a size recalculation after
         * the surrounding layout has finished rendering.
         */

        setTimeout(() => {
            map.invalidateSize();
        }, 100);


        return () => {
            if (markerRef.current) {
                markerRef.current.remove();
                markerRef.current = null;
            }

            if (
                accuracyCircleRef.current
            ) {
                accuracyCircleRef.current.remove();
                accuracyCircleRef.current = null;
            }

            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);


    /* =====================================================
       UPDATE MAP LOCATION
    ===================================================== */

    const updateMapLocation = useCallback(
        (
            latitude,
            longitude,
            accuracy
        ) => {
            const lat =
                toNumber(latitude);

            const lon =
                toNumber(longitude);

            const gpsAccuracy =
                toNumber(accuracy);


            if (
                lat === null ||
                lon === null ||
                !mapRef.current
            ) {
                return;
            }


            const map =
                mapRef.current;


            map.setView(
                [
                    lat,
                    lon,
                ],
                13,
                {
                    animate: true,
                }
            );


            if (markerRef.current) {
                markerRef.current.setLatLng(
                    [
                        lat,
                        lon,
                    ]
                );
            } else {
                markerRef.current =
                    L.circleMarker(
                        [
                            lat,
                            lon,
                        ],
                        {
                            radius: 9,
                            weight: 3,
                            opacity: 1,
                            fillOpacity: 0.85,
                        }
                    )
                        .addTo(map)
                        .bindPopup(
                            "<strong>Your current location</strong>"
                        );
            }


            if (
                gpsAccuracy !== null &&
                gpsAccuracy > 0
            ) {
                if (
                    accuracyCircleRef.current
                ) {
                    accuracyCircleRef.current.setLatLng(
                        [
                            lat,
                            lon,
                        ]
                    );

                    accuracyCircleRef.current.setRadius(
                        gpsAccuracy
                    );
                } else {
                    accuracyCircleRef.current =
                        L.circle(
                            [
                                lat,
                                lon,
                            ],
                            {
                                radius:
                                    gpsAccuracy,
                                weight: 1,
                                fillOpacity: 0.08,
                            }
                        ).addTo(map);
                }
            }


            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        },
        []
    );


    /* =====================================================
       REQUEST SAFETY
    ===================================================== */

    const requestSafety = useCallback(
        async (
            latitude,
            longitude,
            accuracy = null,
            options = {}
        ) => {
            const {
                showRefreshState = false,
            } = options;


            const lat =
                toNumber(latitude);

            const lon =
                toNumber(longitude);

            const gpsAccuracy =
                toNumber(accuracy);


            if (
                lat === null ||
                lon === null
            ) {
                setError(
                    "A valid GPS location is required."
                );

                setLoading(false);
                setRefreshing(false);

                return;
            }


            if (
                locationRequestRef.current
            ) {
                return;
            }


            locationRequestRef.current =
                true;


            if (showRefreshState) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }


            setError("");
            setGpsStatus("connected");


            try {
                updateMapLocation(
                    lat,
                    lon,
                    gpsAccuracy
                );


                const response =
                    await getLocationSafety(
                        lat,
                        lon
                    );


                const normalized =
                    normalizeSafetyResponse(
                        response,
                        {
                            latitude: lat,
                            longitude: lon,
                            accuracy:
                                gpsAccuracy,
                        }
                    );


                setLocationData({
                    latitude:
                        normalized.latitude ??
                        lat,

                    longitude:
                        normalized.longitude ??
                        lon,

                    accuracy:
                        normalized.accuracy ??
                        gpsAccuracy,
                });


                setSafetyData(
                    normalized
                );


                updateMapLocation(
                    normalized.latitude ??
                        lat,

                    normalized.longitude ??
                        lon,

                    normalized.accuracy ??
                        gpsAccuracy
                );
            } catch (requestError) {
                console.error(
                    "Safety map request failed:",
                    requestError
                );

                setError(
                    getReadableError(
                        requestError
                    )
                );
            } finally {
                setLoading(false);
                setRefreshing(false);

                locationRequestRef.current =
                    false;
            }
        },
        [
            updateMapLocation,
        ]
    );


    /* =====================================================
       GET CURRENT LOCATION
    ===================================================== */

    const getCurrentLocation =
        useCallback(
            (
                options = {}
            ) => {
                if (
                    !navigator.geolocation
                ) {
                    setGpsStatus("error");

                    setError(
                        "Geolocation is not supported by this browser."
                    );

                    setLoading(false);

                    return;
                }


                setGpsStatus("connecting");
                setError("");


                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const {
                            latitude,
                            longitude,
                            accuracy,
                        } = position.coords;


                        requestSafety(
                            latitude,
                            longitude,
                            accuracy,
                            options
                        );
                    },

                    (geoError) => {
                        console.error(
                            "Geolocation error:",
                            geoError
                        );


                        setGpsStatus("error");

                        setLoading(false);
                        setRefreshing(false);


                        if (
                            geoError.code ===
                            geoError.PERMISSION_DENIED
                        ) {
                            setError(
                                "Location permission was denied. Please allow location access in your browser."
                            );
                        } else if (
                            geoError.code ===
                            geoError.POSITION_UNAVAILABLE
                        ) {
                            setError(
                                "Your current location could not be determined."
                            );
                        } else if (
                            geoError.code ===
                            geoError.TIMEOUT
                        ) {
                            setError(
                                "Location request timed out. Please try again."
                            );
                        } else {
                            setError(
                                "Unable to determine your current location."
                            );
                        }
                    },

                    {
                        enableHighAccuracy: true,
                        timeout: 15000,
                        maximumAge: 30000,
                    }
                );
            },
            [
                requestSafety,
            ]
        );


    /* =====================================================
       INITIAL GPS REQUEST
    ===================================================== */

    useEffect(() => {
        getCurrentLocation();
    }, [getCurrentLocation]);


    /* =====================================================
       REFRESH SAFETY
    ===================================================== */

    const refreshSafety = () => {
        getCurrentLocation({
            showRefreshState: true,
        });
    };


    /* =====================================================
       OPEN GOOGLE MAPS
    ===================================================== */

    const openGoogleMaps = () => {
        const latitude =
            locationData?.latitude;

        const longitude =
            locationData?.longitude;


        if (
            latitude === null ||
            latitude === undefined ||
            longitude === null ||
            longitude === undefined
        ) {
            return;
        }


        const url =
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${latitude},${longitude}`
            )}`;


        window.open(
            url,
            "_blank",
            "noopener,noreferrer"
        );
    };


    /* =====================================================
       RISK
    ===================================================== */

    const riskLevel =
        safetyData?.riskLevel ||
        "UNKNOWN";

    const riskClass =
        getRiskClass(
            riskLevel
        );


    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <div className="safety-map-page">

            {/* =================================================
                SIMPLE BACK BUTTON
            ================================================= */}

            <div className="safety-map-topbar">

                <button
                    type="button"
                    className="safety-map-back-button"
                    onClick={() =>
                        navigate(
                            "/dashboard"
                        )
                    }
                >
                    ← Back to Dashboard
                </button>

            </div>


            {/* =================================================
                PAGE HEADER
            ================================================= */}

            <section className="safety-map-header">

                <div>

                    <div className="safety-map-eyebrow">
                        LOCATION INTELLIGENCE
                    </div>

                    <h1>
                        Safety Map
                    </h1>

                    <p>
                        View your current location
                        and the estimated safety risk
                        for the surrounding district.
                    </p>

                </div>


                <div className="safety-map-header-actions">

                    <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                            getCurrentLocation()
                        }
                        disabled={
                            loading ||
                            refreshing
                        }
                    >
                        Use My Location
                    </button>


                    <button
                        type="button"
                        className="primary-button"
                        onClick={
                            refreshSafety
                        }
                        disabled={
                            loading ||
                            refreshing
                        }
                    >
                        {refreshing
                            ? "Refreshing..."
                            : "Refresh Safety"}
                    </button>

                </div>

            </section>


            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
                <div className="safety-map-error">

                    <strong>
                        Unable to update map
                    </strong>

                    <span>
                        {String(error)}
                    </span>

                </div>
            )}


            {/* =================================================
                MAIN LAYOUT
            ================================================= */}

            <main className="safety-map-layout">

                {/* =================================================
                    MAP
                ================================================= */}

                <section className="map-panel">

                    <div className="map-panel-header">

                        <div>

                            <div className="map-panel-label">
                                LIVE LOCATION
                            </div>

                            <h2>
                                {loading
                                    ? "Finding your location..."
                                    : locationData
                                      ? "Your current location"
                                      : "Waiting for location"}
                            </h2>

                        </div>


                        <div
                            className={`gps-status ${
                                gpsStatus
                            }`}
                        >

                            <span />

                            {gpsStatus ===
                            "connected"
                                ? "GPS connected"
                                : gpsStatus ===
                                  "error"
                                  ? "GPS unavailable"
                                  : "Connecting GPS"}

                        </div>

                    </div>


                    <div
                        ref={
                            mapContainerRef
                        }
                        className="map-container safeher-leaflet-map"
                    />


                    <div className="map-panel-footer">

                        <div className="risk-legend">

                            <span>
                                <i className="legend-dot low" />
                                Low
                            </span>

                            <span>
                                <i className="legend-dot moderate" />
                                Moderate
                            </span>

                            <span>
                                <i className="legend-dot high" />
                                High
                            </span>

                            <span>
                                <i className="legend-dot critical" />
                                Critical
                            </span>

                        </div>


                        <button
                            type="button"
                            className="maps-button"
                            onClick={
                                openGoogleMaps
                            }
                            disabled={
                                !locationData
                            }
                        >
                            Open in Google Maps →
                        </button>

                    </div>

                </section>


                {/* =================================================
                    SIDEBAR
                ================================================= */}

                <aside className="safety-map-sidebar">

                    {/* CURRENT ASSESSMENT */}

                    <section className="info-card assessment-card">

                        <div className="card-eyebrow">
                            CURRENT ASSESSMENT
                        </div>


                        <div className="assessment-heading">

                            <div>

                                <h2>
                                    {safetyData?.district ||
                                        "Unknown"}
                                </h2>

                                <p>
                                    Estimated district safety
                                </p>

                            </div>


                            <span
                                className={`risk-badge ${riskClass}`}
                            >
                                {riskLevel}
                            </span>

                        </div>


                        <div className="risk-score">

                            <strong>
                                {formatRiskScore(
                                    safetyData?.riskScore
                                )}
                            </strong>

                            <span>
                                / 100
                            </span>

                        </div>


                        <div className="assessment-divider" />


                        <p className="assessment-message">

                            {safetyData
                                ? "Risk is estimated using historical crime patterns and machine-learning predictions."
                                : "Safety information is currently unavailable."}

                        </p>

                    </section>


                    {/* LOCATION DETAILS */}

                    <section className="info-card">

                        <div className="card-eyebrow">
                            LOCATION DETAILS
                        </div>


                        <div className="detail-row">

                            <span>
                                Latitude
                            </span>

                            <strong>
                                {locationData?.latitude ??
                                    "--"}
                            </strong>

                        </div>


                        <div className="detail-row">

                            <span>
                                Longitude
                            </span>

                            <strong>
                                {locationData?.longitude ??
                                    "--"}
                            </strong>

                        </div>


                        <div className="detail-row">

                            <span>
                                GPS Accuracy
                            </span>

                            <strong>
                                {locationData?.accuracy
                                    ? `±${formatNumber(
                                          locationData.accuracy
                                      )}m`
                                    : "--"}
                            </strong>

                        </div>

                    </section>


                    {/* RISK ANALYSIS */}

                    <section className="info-card">

                        <div className="card-eyebrow">
                            RISK ANALYSIS
                        </div>


                        <div className="prediction-row">

                            <div>

                                <strong>
                                    IPC prediction
                                </strong>

                                <small>
                                    Historical model estimate
                                </small>

                            </div>

                            <strong>
                                {formatNumber(
                                    safetyData?.ipcPrediction
                                )}
                            </strong>

                        </div>


                        <div className="prediction-row">

                            <div>

                                <strong>
                                    Women-related crime
                                </strong>

                                <small>
                                    Historical model estimate
                                </small>

                            </div>

                            <strong>
                                {formatNumber(
                                    safetyData?.womenCrimePrediction
                                )}
                            </strong>

                        </div>

                    </section>


                    {/* RISK EXPLANATION */}

                    <section className="risk-information-card">

                        <div className="risk-information-icon">
                            i
                        </div>


                        <div>

                            <h3>
                                How SafeHer calculates risk
                            </h3>

                            <p>
                                The risk score combines
                                historical crime patterns
                                with model predictions for
                                the detected Maharashtra
                                district.
                            </p>

                        </div>

                    </section>

                </aside>

            </main>

        </div>
    );
}


export default SafetyMap;