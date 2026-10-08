import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
    cancelSOS,
    createSOS,
    getLocationSafety,
    getSOSHistory,
} from "../services/api";

import "./SOS.css";


function SOS() {
    const [location, setLocation] = useState(null);
    const [safety, setSafety] = useState(null);
    const [sosHistory, setSosHistory] = useState([]);

    const [loadingLocation, setLoadingLocation] =
        useState(false);

    const [activating, setActivating] =
        useState(false);

    const [cancelling, setCancelling] =
        useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");


    // ========================================================
    // LOAD SOS HISTORY
    // ========================================================

    const loadSOSHistory = async () => {
        try {
            const response =
                await getSOSHistory();

            setSosHistory(
                Array.isArray(response?.data)
                    ? response.data
                    : []
            );

        } catch (requestError) {

            const message =
                requestError?.response?.data?.detail;

            setError(
                message ||
                "Unable to load SOS history."
            );
        }
    };


    useEffect(() => {
        loadSOSHistory();
    }, []);


    // ========================================================
    // GET CURRENT LOCATION
    // ========================================================

    const getCurrentLocation = () => {
        return new Promise(
            (resolve, reject) => {

                if (!navigator.geolocation) {
                    reject(
                        new Error(
                            "Location services are not supported by this browser."
                        )
                    );

                    return;
                }

                navigator.geolocation.getCurrentPosition(
                    resolve,
                    (locationError) => {

                        if (
                            locationError.code ===
                            locationError.PERMISSION_DENIED
                        ) {
                            reject(
                                new Error(
                                    "Location permission was denied. Please allow location access."
                                )
                            );

                            return;
                        }

                        if (
                            locationError.code ===
                            locationError.POSITION_UNAVAILABLE
                        ) {
                            reject(
                                new Error(
                                    "Your current location is unavailable."
                                )
                            );

                            return;
                        }

                        if (
                            locationError.code ===
                            locationError.TIMEOUT
                        ) {
                            reject(
                                new Error(
                                    "Location request timed out."
                                )
                            );

                            return;
                        }

                        reject(
                            new Error(
                                "Unable to access your current location."
                            )
                        );
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 15000,
                        maximumAge: 30000,
                    }
                );
            }
        );
    };


    // ========================================================
    // CHECK LOCATION SAFETY
    // ========================================================

    const checkLocation = async () => {

        setError("");
        setSuccess("");
        setLoadingLocation(true);

        try {

            const position =
                await getCurrentLocation();

            const latitude =
                position.coords.latitude;

            const longitude =
                position.coords.longitude;

            setLocation({
                latitude,
                longitude,
                accuracy:
                    position.coords.accuracy,
            });


            const response =
                await getLocationSafety(
                    latitude,
                    longitude
                );

            setSafety(
                response?.data || null
            );

            return {
                latitude,
                longitude,
                safety:
                    response?.data || null,
            };

        } catch (locationError) {

            setError(
                locationError.message ||
                "Unable to determine your location."
            );

            throw locationError;

        } finally {
            setLoadingLocation(false);
        }
    };


    // ========================================================
    // ACTIVATE SOS
    // ========================================================

    const handleActivateSOS = async () => {

        const confirmed = window.confirm(
            "Activate emergency SOS? Your current location will be recorded with this emergency event."
        );

        if (!confirmed) {
            return;
        }

        setError("");
        setSuccess("");
        setActivating(true);

        try {

            let currentLocation =
                location;

            let currentSafety =
                safety;


            if (!currentLocation) {

                const result =
                    await checkLocation();

                currentLocation = {
                    latitude:
                        result.latitude,

                    longitude:
                        result.longitude,
                };

                currentSafety =
                    result.safety;
            }


            const riskLevel =
                currentSafety?.risk_level ||
                null;

            const riskScore =
                typeof currentSafety?.risk_score ===
                "number"
                    ? currentSafety.risk_score
                    : null;


            const response =
                await createSOS({
                    latitude:
                        currentLocation.latitude,

                    longitude:
                        currentLocation.longitude,

                    risk_level:
                        riskLevel,

                    risk_score:
                        riskScore,
                });


            if (response?.data) {

                setSosHistory(
                    (previous) => [
                        response.data,
                        ...previous,
                    ]
                );
            }


            setSuccess(
                "SOS activated successfully. Your emergency event has been recorded."
            );

        } catch (requestError) {

            const backendMessage =
                requestError?.response?.data?.detail;

            setError(
                backendMessage ||
                requestError?.message ||
                "Unable to activate SOS."
            );

        } finally {
            setActivating(false);
        }
    };


    // ========================================================
    // CANCEL SOS
    // ========================================================

    const handleCancelSOS = async (
        sosId
    ) => {

        const confirmed = window.confirm(
            "Cancel this active SOS event?"
        );

        if (!confirmed) {
            return;
        }

        setError("");
        setSuccess("");
        setCancelling(true);

        try {

            const response =
                await cancelSOS(sosId);

            const updatedSOS =
                response?.data;

            if (updatedSOS) {

                setSosHistory(
                    (previous) =>
                        previous.map(
                            (event) =>
                                event.sos_id ===
                                sosId
                                    ? updatedSOS
                                    : event
                        )
                );
            }

            setSuccess(
                "SOS event cancelled."
            );

        } catch (requestError) {

            const backendMessage =
                requestError?.response?.data?.detail;

            setError(
                backendMessage ||
                "Unable to cancel SOS."
            );

        } finally {
            setCancelling(false);
        }
    };


    // ========================================================
    // ACTIVE SOS
    // ========================================================

    const activeSOS =
        sosHistory.find(
            (event) =>
                event.status === "ACTIVE"
        );


    // ========================================================
    // RISK CLASS
    // ========================================================

    const getRiskClass = (level) => {

        switch (level) {

            case "LOW":
                return "sos-risk-low";

            case "MODERATE":
                return "sos-risk-moderate";

            case "HIGH":
                return "sos-risk-high";

            case "CRITICAL":
                return "sos-risk-critical";

            default:
                return "sos-risk-unknown";
        }
    };


    // ========================================================
    // FORMAT DATE
    // ========================================================

    const formatDate = (dateValue) => {

        if (!dateValue) {
            return "Unknown";
        }

        try {
            return new Date(
                dateValue
            ).toLocaleString();
        } catch {
            return "Unknown";
        }
    };


    // ========================================================
    // UI
    // ========================================================

    return (
        <div className="sos-page">

            {/* ==================================================
                HEADER
            ================================================== */}

            <header className="sos-header">

                <Link
                    to="/dashboard"
                    className="sos-back-link"
                >
                    ← Dashboard
                </Link>

                <p className="sos-eyebrow">
                    EMERGENCY RESPONSE
                </p>

                <h1>
                    Emergency SOS
                </h1>

                <p className="sos-description">
                    Use SOS when you need immediate
                    assistance. Your current location
                    will be recorded with the emergency
                    event.
                </p>

            </header>


            <main className="sos-content">

                {/* ==================================================
                    ACTIVE SOS
                ================================================== */}

                {activeSOS && (
                    <section className="active-sos-card">

                        <div className="active-sos-indicator">
                            <span />
                            ACTIVE
                        </div>

                        <h2>
                            Emergency SOS is active
                        </h2>

                        <p>
                            Your emergency event has
                            been recorded.
                        </p>

                        <div className="active-sos-details">

                            <div>
                                <span>
                                    Latitude
                                </span>

                                <strong>
                                    {activeSOS.latitude.toFixed(
                                        6
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Longitude
                                </span>

                                <strong>
                                    {activeSOS.longitude.toFixed(
                                        6
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Risk
                                </span>

                                <strong>
                                    {activeSOS.risk_level ||
                                        "Unknown"}
                                </strong>
                            </div>

                        </div>

                        <button
                            className="cancel-sos-button"
                            onClick={() =>
                                handleCancelSOS(
                                    activeSOS.sos_id
                                )
                            }
                            disabled={cancelling}
                        >
                            {cancelling
                                ? "Cancelling..."
                                : "Cancel SOS"}
                        </button>

                    </section>
                )}


                {/* ==================================================
                    MESSAGES
                ================================================== */}

                {error && (
                    <div
                        className="sos-message sos-error"
                        role="alert"
                    >
                        {error}
                    </div>
                )}

                {success && (
                    <div
                        className="sos-message sos-success"
                        role="status"
                    >
                        {success}
                    </div>
                )}


                {/* ==================================================
                    SOS ACTION
                ================================================== */}

                {!activeSOS && (
                    <section className="sos-action-card">

                        <div className="sos-button-wrapper">

                            <button
                                className="sos-main-button"
                                onClick={
                                    handleActivateSOS
                                }
                                disabled={
                                    activating ||
                                    loadingLocation
                                }
                                aria-label="Activate emergency SOS"
                            >
                                <span className="sos-main-label">
                                    {activating
                                        ? "ACTIVATING"
                                        : "SOS"}
                                </span>

                                <span className="sos-main-subtitle">
                                    {activating
                                        ? "Please wait"
                                        : "Press for emergency"}
                                </span>
                            </button>

                        </div>


                        <h2>
                            Need emergency help?
                        </h2>

                        <p>
                            Activate SOS to record
                            your current location
                            and safety information.
                        </p>


                        <button
                            className="check-location-button"
                            onClick={
                                checkLocation
                            }
                            disabled={
                                loadingLocation ||
                                activating
                            }
                        >
                            {loadingLocation
                                ? "Getting location..."
                                : "Check my location first"}
                        </button>

                    </section>
                )}


                {/* ==================================================
                    CURRENT LOCATION
                ================================================== */}

                {location && (
                    <section className="sos-card">

                        <div className="sos-card-header">

                            <div>

                                <p className="card-label">
                                    CURRENT LOCATION
                                </p>

                                <h2>
                                    Location details
                                </h2>

                            </div>

                            <span className="sos-card-icon">
                                ◉
                            </span>

                        </div>


                        <div className="sos-location-grid">

                            <div>
                                <span>
                                    Latitude
                                </span>

                                <strong>
                                    {location.latitude.toFixed(
                                        6
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Longitude
                                </span>

                                <strong>
                                    {location.longitude.toFixed(
                                        6
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    GPS accuracy
                                </span>

                                <strong>
                                    ±
                                    {Math.round(
                                        location.accuracy
                                    )}
                                    m
                                </strong>
                            </div>

                        </div>

                    </section>
                )}


                {/* ==================================================
                    SAFETY ASSESSMENT
                ================================================== */}

                {safety && (
                    <section className="sos-card">

                        <div className="sos-card-header">

                            <div>

                                <p className="card-label">
                                    LOCATION ANALYSIS
                                </p>

                                <h2>
                                    Current safety
                                </h2>

                            </div>

                            <span className="sos-card-icon">
                                !
                            </span>

                        </div>


                        <div className="sos-safety-grid">

                            <div className="sos-safety-main">

                                <span
                                    className={`sos-risk-badge ${getRiskClass(
                                        safety.risk_level
                                    )}`}
                                >
                                    {safety.risk_level ||
                                        "UNKNOWN"}
                                </span>

                                <div className="sos-score">

                                    <strong>
                                        {typeof safety.risk_score ===
                                        "number"
                                            ? safety.risk_score.toFixed(
                                                  1
                                              )
                                            : "—"}
                                    </strong>

                                    <span>
                                        / 100
                                    </span>

                                </div>

                            </div>


                            <div className="sos-safety-stats">

                                <div>
                                    <span>
                                        District
                                    </span>

                                    <strong>
                                        {safety.location
                                            ?.district ||
                                            "Unknown"}
                                    </strong>
                                </div>


                                <div>
                                    <span>
                                        Predicted IPC
                                    </span>

                                    <strong>
                                        {typeof safety.predicted_next_year_ipc ===
                                        "number"
                                            ? Math.round(
                                                  safety.predicted_next_year_ipc
                                              ).toLocaleString()
                                            : "—"}
                                    </strong>
                                </div>


                                <div>
                                    <span>
                                        Women-related crime
                                    </span>

                                    <strong>
                                        {typeof safety.predicted_next_year_women_crimes ===
                                        "number"
                                            ? Math.round(
                                                  safety.predicted_next_year_women_crimes
                                              ).toLocaleString()
                                            : "—"}
                                    </strong>
                                </div>

                            </div>

                        </div>

                    </section>
                )}


                {/* ==================================================
                    SOS HISTORY
                ================================================== */}

                <section className="sos-card">

                    <div className="sos-card-header">

                        <div>

                            <p className="card-label">
                                HISTORY
                            </p>

                            <h2>
                                SOS events
                            </h2>

                        </div>

                        <span className="sos-card-icon">
                            !
                        </span>

                    </div>


                    {sosHistory.length === 0 ? (

                        <div className="sos-empty">
                            No SOS events recorded yet.
                        </div>

                    ) : (

                        <div className="sos-history">

                            {sosHistory.map(
                                (event) => (

                                    <div
                                        className="sos-history-item"
                                        key={event.sos_id}
                                    >

                                        <div className="history-status">
                                            <span
                                                className={
                                                    event.status ===
                                                    "ACTIVE"
                                                        ? "status-active"
                                                        : "status-cancelled"
                                                }
                                            >
                                                {event.status}
                                            </span>
                                        </div>


                                        <div className="history-info">

                                            <strong>
                                                {formatDate(
                                                    event.created_at
                                                )}
                                            </strong>

                                            <span>
                                                {event.latitude.toFixed(
                                                    5
                                                )}
                                                ,{" "}
                                                {event.longitude.toFixed(
                                                    5
                                                )}
                                            </span>

                                        </div>


                                        <div className="history-risk">

                                            {event.risk_level && (
                                                <span
                                                    className={`sos-risk-badge ${getRiskClass(
                                                        event.risk_level
                                                    )}`}
                                                >
                                                    {
                                                        event.risk_level
                                                    }
                                                </span>
                                            )}

                                        </div>

                                    </div>

                                )
                            )}

                        </div>

                    )}

                </section>


                {/* ==================================================
                    EMERGENCY NOTICE
                ================================================== */}

                <div className="sos-notice">

                    <div className="notice-icon">
                        !
                    </div>

                    <div>

                        <strong>
                            Important
                        </strong>

                        <p>
                            SafeHer records your SOS
                            event and location. This
                            MVP does not yet automatically
                            contact police, ambulance
                            services, or your emergency
                            contacts.
                        </p>

                    </div>

                </div>

            </main>

        </div>
    );
}


export default SOS;