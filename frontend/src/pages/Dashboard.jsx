import { useEffect, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import {
    clearAuth,
    createSOS,
    getCurrentUser,
    getLocationSafety,
    getStoredUser,
} from "../services/api";

import "./Dashboard.css";


function Dashboard() {
    const navigate = useNavigate();

    const [user, setUser] = useState(
        getStoredUser()
    );

    const [location, setLocation] = useState(null);
    const [safety, setSafety] = useState(null);

    const [loading, setLoading] = useState(true);
    const [locationLoading, setLocationLoading] =
        useState(false);

    const [sosLoading, setSosLoading] =
        useState(false);

    const [sosSuccess, setSosSuccess] =
        useState(false);

    const [error, setError] = useState("");


    // ========================================================
    // LOAD USER
    // ========================================================

    useEffect(() => {
        const loadUser = async () => {
            try {
                const currentUser =
                    await getCurrentUser();

                setUser(currentUser);
            } catch {
                clearAuth();
                navigate("/login");
            }
        };

        loadUser();
    }, [navigate]);


    // ========================================================
    // LOAD LOCATION
    // ========================================================

    useEffect(() => {
        checkCurrentLocation();
    }, []);


    // ========================================================
    // GET LOCATION + SAFETY
    // ========================================================

    const checkCurrentLocation = () => {

        if (!navigator.geolocation) {
            setError(
                "Location services are not supported by this browser."
            );

            setLoading(false);
            return;
        }

        setLocationLoading(true);
        setError("");

        navigator.geolocation.getCurrentPosition(
            async (position) => {

                const latitude =
                    position.coords.latitude;

                const longitude =
                    position.coords.longitude;

                const accuracy =
                    position.coords.accuracy;


                setLocation({
                    latitude,
                    longitude,
                    accuracy,
                });


                try {

                    const response =
                        await getLocationSafety(
                            latitude,
                            longitude
                        );

                    const payload =
                        response?.data ||
                        response ||
                        {};

                    const locationData =
                        payload.location ||
                        payload.data?.location ||
                        {};

                    const safetyData =
                        payload.safety ||
                        payload.risk ||
                        payload.data?.safety ||
                        payload.data?.risk ||
                        {};


                    setLocation(
                        (previous) => ({
                            ...previous,

                            district:
                                locationData?.district ||
                                null,
                        })
                    );


                    setSafety({
                        risk_level:
                            safetyData?.risk_level ??
                            null,

                        risk_score:
                            safetyData?.risk_score ??
                            null,

                        predicted_next_year_ipc:
                            safetyData
                                ?.predicted_next_year_ipc ??
                            null,

                        predicted_next_year_women_crimes:
                            safetyData
                                ?.predicted_next_year_women_crimes ??
                            null,

                        reasons:
                            safetyData?.reasons ??
                            [],
                    });

                } catch (requestError) {

                    const message =
                        requestError?.response?.data?.detail;

                    setError(
                        message ||
                        "Unable to load safety information."
                    );

                    setSafety(null);

                } finally {

                    setLocationLoading(false);
                    setLoading(false);
                }
            },

            (locationError) => {

                if (
                    locationError.code ===
                    locationError.PERMISSION_DENIED
                ) {

                    setError(
                        "Location permission was denied. Please allow location access."
                    );

                } else if (
                    locationError.code ===
                    locationError.POSITION_UNAVAILABLE
                ) {

                    setError(
                        "Your current location is unavailable."
                    );

                } else if (
                    locationError.code ===
                    locationError.TIMEOUT
                ) {

                    setError(
                        "Location request timed out."
                    );

                } else {

                    setError(
                        "Unable to access your current location."
                    );
                }

                setLocationLoading(false);
                setLoading(false);
            },

            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 30000,
            }
        );
    };


    // ========================================================
    // ONE-TAP SOS
    // ========================================================

    const handleEmergencySOS = async () => {

        if (sosLoading) {
            return;
        }

        setError("");
        setSosSuccess(false);
        setSosLoading(true);


        try {

            let currentLocation =
                location;

            let currentSafety =
                safety;


            // ------------------------------------------------
            // Get fresh GPS if not available
            // ------------------------------------------------

            if (!currentLocation) {

                if (!navigator.geolocation) {
                    throw new Error(
                        "Location services are not supported by this browser."
                    );
                }


                const position =
                    await new Promise(
                        (resolve, reject) => {

                            navigator.geolocation.getCurrentPosition(
                                resolve,
                                () =>
                                    reject(
                                        new Error(
                                            "Unable to access your current location."
                                        )
                                    ),
                                {
                                    enableHighAccuracy: true,
                                    timeout: 10000,
                                    maximumAge: 0,
                                }
                            );
                        }
                    );


                currentLocation = {
                    latitude:
                        position.coords.latitude,

                    longitude:
                        position.coords.longitude,

                    accuracy:
                        position.coords.accuracy,
                };


                setLocation(
                    currentLocation
                );


                // --------------------------------------------
                // Get fresh safety analysis
                // --------------------------------------------

                try {

                    const safetyResponse =
                        await getLocationSafety(
                            currentLocation.latitude,
                            currentLocation.longitude
                        );

                    const payload =
                        safetyResponse?.data ||
                        safetyResponse ||
                        {};

                    currentSafety =
                        payload.safety ||
                        payload.risk ||
                        payload.data?.safety ||
                        payload.data?.risk ||
                        null;

                    const locationData =
                        payload.location ||
                        payload.data?.location ||
                        {};

                    setSafety(
                        currentSafety
                    );

                    setLocation(
                        (previous) => ({
                            ...previous,

                            ...currentLocation,

                            district:
                                locationData?.district ||
                                null,
                        })
                    );

                } catch {
                    currentSafety = null;
                }
            }


            // ------------------------------------------------
            // ACTIVATE SOS
            // ------------------------------------------------

            const response =
                await createSOS({

                    latitude:
                        currentLocation.latitude,

                    longitude:
                        currentLocation.longitude,

                    risk_level:
                        currentSafety?.risk_level ??
                        null,

                    risk_score:
                        typeof currentSafety?.risk_score ===
                        "number"
                            ? currentSafety.risk_score
                            : null,
                });


            if (
                response?.success === true ||
                response?.data
            ) {

                setSosSuccess(true);

                // Open the SOS status page after
                // the emergency event has been created.
                setTimeout(() => {
                    navigate("/sos");
                }, 800);

            } else {

                throw new Error(
                    "Unable to activate SOS."
                );
            }


        } catch (requestError) {

            const backendMessage =
                requestError?.response?.data?.detail;

            setError(
                backendMessage ||
                requestError?.message ||
                "Unable to activate emergency SOS."
            );

        } finally {

            setSosLoading(false);
        }
    };


    // ========================================================
    // LOGOUT
    // ========================================================

    const handleLogout = () => {

        clearAuth();

        navigate("/login");
    };


    // ========================================================
    // HELPERS
    // ========================================================

    const formatNumber = (value) => {

        if (
            value === null ||
            value === undefined ||
            Number.isNaN(Number(value))
        ) {
            return "—";
        }

        return Math.round(
            Number(value)
        ).toLocaleString();
    };


    const formatScore = (value) => {

        if (
            value === null ||
            value === undefined ||
            Number.isNaN(Number(value))
        ) {
            return "—";
        }

        return Number(value).toFixed(1);
    };


    const getRiskClass = (riskLevel) => {

        switch (
            String(riskLevel || "").toUpperCase()
        ) {

            case "LOW":
                return "risk-low";

            case "MODERATE":
                return "risk-moderate";

            case "HIGH":
                return "risk-high";

            case "CRITICAL":
                return "risk-critical";

            default:
                return "risk-unknown";
        }
    };


    const firstName =
        user?.full_name?.split(" ")[0] ||
        user?.fullName?.split(" ")[0] ||
        "there";


    // ========================================================
    // UI
    // ========================================================

    return (
        <div className="dashboard-layout">

            {/* ==================================================
                SIDEBAR
            ================================================== */}

            <aside className="dashboard-sidebar">

                <div className="sidebar-brand">

                    <div className="brand-logo">
                        SH
                    </div>

                    <div>
                        <strong>
                            SafeHer
                        </strong>

                        <span>
                            Safety Platform
                        </span>
                    </div>

                </div>


                <nav className="sidebar-nav">

                    <Link
                        to="/dashboard"
                        className="sidebar-link active"
                    >
                        <span>⌂</span>
                        Dashboard
                    </Link>


                    <Link
                        to="/safety-map"
                        className="sidebar-link"
                    >
                        <span>◉</span>
                        Safety Map
                    </Link>


                    <Link
                        to="/contacts"
                        className="sidebar-link"
                    >
                        <span>♙</span>
                        Emergency Contacts
                    </Link>


                    <Link
                        to="/sos"
                        className="sidebar-link"
                    >
                        <span>!</span>
                        SOS
                    </Link>


                    <div className="sidebar-divider" />


                    <Link
                        to="/profile"
                        className="sidebar-link"
                    >
                        <span>◯</span>
                        Profile
                    </Link>


                    <Link
                        to="/settings"
                        className="sidebar-link"
                    >
                        <span>⚙</span>
                        Settings
                    </Link>

                </nav>


                <button
                    className="sidebar-logout"
                    onClick={handleLogout}
                >
                    ↪
                    <span>
                        Sign out
                    </span>
                </button>

            </aside>


            {/* ==================================================
                MAIN
            ================================================== */}

            <main className="dashboard-main">

                {/* ==================================================
                    HEADER
                ================================================== */}

                <header className="dashboard-header">

                    <div>

                        <p className="dashboard-eyebrow">
                            PERSONAL SAFETY
                        </p>

                        <h1>
                            Good to see you,{" "}
                            {firstName}
                        </h1>

                        <p className="dashboard-subtitle">
                            Stay aware. Stay connected.
                            Stay safe.
                        </p>

                    </div>


                    <div className="dashboard-user">

                        <div className="user-avatar">
                            {firstName
                                .charAt(0)
                                .toUpperCase()}
                        </div>

                        <div>

                            <strong>
                                {user?.full_name ||
                                    firstName}
                            </strong>

                            <span>
                                {user?.email || ""}
                            </span>

                        </div>

                    </div>

                </header>


                {/* ==================================================
                    ERROR
                ================================================== */}

                {error && (
                    <div
                        className="dashboard-error"
                        role="alert"
                    >
                        {error}
                    </div>
                )}


                {/* ==================================================
                    SOS SUCCESS
                ================================================== */}

                {sosSuccess && (
                    <div
                        className="dashboard-sos-success"
                        role="status"
                    >
                        <strong>
                            🚨 SOS ACTIVATED
                        </strong>

                        <span>
                            Emergency event recorded.
                            Your saved emergency contacts
                            have been notified by email.
                        </span>
                    </div>
                )}


                {/* ==================================================
                    QUICK ACTIONS
                ================================================== */}

                <section className="quick-actions">

                    <button
                        className="quick-action sos-action"
                        onClick={
                            handleEmergencySOS
                        }
                        disabled={
                            sosLoading
                        }
                    >

                        <div className="quick-action-icon">
                            !
                        </div>

                        <div>

                            <strong>
                                {sosLoading
                                    ? "Activating SOS..."
                                    : "Emergency SOS"}
                            </strong>

                            <span>
                                {sosLoading
                                    ? "Getting your location"
                                    : "One tap for emergency help"}
                            </span>

                        </div>

                    </button>


                    <button
                        className="quick-action"
                        onClick={
                            checkCurrentLocation
                        }
                        disabled={
                            locationLoading
                        }
                    >

                        <div className="quick-action-icon">
                            ◉
                        </div>

                        <div>

                            <strong>
                                Check Safety
                            </strong>

                            <span>
                                {locationLoading
                                    ? "Analyzing location..."
                                    : "Analyze current location"}
                            </span>

                        </div>

                    </button>


                    <Link
                        to="/contacts"
                        className="quick-action"
                    >

                        <div className="quick-action-icon">
                            ♧
                        </div>

                        <div>

                            <strong>
                                Emergency Contacts
                            </strong>

                            <span>
                                Manage trusted contacts
                            </span>

                        </div>

                    </Link>

                </section>


                {/* ==================================================
                    LOCATION + RISK
                ================================================== */}

                <section className="dashboard-grid">

                    <div className="dashboard-card">

                        <div className="card-heading">

                            <div>

                                <p className="card-label">
                                    CURRENT LOCATION
                                </p>

                                <h2>
                                    {location?.district ||
                                        "Your safety area"}
                                </h2>

                            </div>

                            <div className="card-icon">
                                ◉
                            </div>

                        </div>


                        <div className="location-details">

                            <div>
                                <span>
                                    Latitude
                                </span>

                                <strong>
                                    {location
                                        ? location.latitude.toFixed(
                                            6
                                        )
                                        : "—"}
                                </strong>
                            </div>


                            <div>
                                <span>
                                    Longitude
                                </span>

                                <strong>
                                    {location
                                        ? location.longitude.toFixed(
                                            6
                                        )
                                        : "—"}
                                </strong>
                            </div>


                            <div>
                                <span>
                                    GPS accuracy
                                </span>

                                <strong>
                                    {location
                                        ? `±${Math.round(
                                            location.accuracy
                                        )}m`
                                        : "—"}
                                </strong>
                            </div>

                        </div>

                    </div>


                    <div className="dashboard-card">

                        <div className="card-heading">

                            <div>

                                <p className="card-label">
                                    SAFETY ASSESSMENT
                                </p>

                                <h2>
                                    Current risk
                                </h2>

                            </div>

                            <div className="card-icon">
                                !
                            </div>

                        </div>


                        <div className="risk-display">

                            <span
                                className={`risk-badge ${getRiskClass(
                                    safety?.risk_level
                                )}`}
                            >
                                {safety?.risk_level ||
                                    "CALCULATING"}
                            </span>


                            <div className="risk-score">

                                <strong>
                                    {formatScore(
                                        safety?.risk_score
                                    )}
                                </strong>

                                <span>
                                    / 100
                                </span>

                            </div>

                        </div>

                    </div>

                </section>


                {/* ==================================================
                    SAFETY DETAILS
                ================================================== */}

                <section className="dashboard-card analysis-card">

                    <div className="card-heading">

                        <div>

                            <p className="card-label">
                                ANALYSIS
                            </p>

                            <h2>
                                Safety details
                            </h2>

                        </div>

                    </div>


                    <div className="analysis-grid">

                        <div>
                            <span>
                                District
                            </span>

                            <strong>
                                {location?.district ||
                                    "—"}
                            </strong>
                        </div>


                        <div>
                            <span>
                                Risk score
                            </span>

                            <strong>
                                {formatScore(
                                    safety?.risk_score
                                )}
                            </strong>
                        </div>


                        <div>
                            <span>
                                IPC prediction
                            </span>

                            <strong>
                                {formatNumber(
                                    safety?.predicted_next_year_ipc
                                )}
                            </strong>
                        </div>


                        <div>
                            <span>
                                Women-related crime
                            </span>

                            <strong>
                                {formatNumber(
                                    safety?.predicted_next_year_women_crimes
                                )}
                            </strong>
                        </div>

                    </div>

                </section>


                {/* ==================================================
                    RISK REASONS
                ================================================== */}

                {Array.isArray(
                    safety?.reasons
                ) &&
                    safety.reasons.length > 0 && (

                        <section className="dashboard-card">

                            <div className="card-heading">

                                <div>

                                    <p className="card-label">
                                        RISK EXPLANATION
                                    </p>

                                    <h2>
                                        Why this risk level?
                                    </h2>

                                </div>

                            </div>


                            <div className="risk-reasons">

                                {safety.reasons.map(
                                    (reason, index) => (

                                        <div
                                            key={index}
                                            className="risk-reason"
                                        >
                                            {reason}
                                        </div>

                                    )
                                )}

                            </div>

                        </section>
                    )}


                {/* ==================================================
                    SAFETY NOTICE
                ================================================== */}

                <div className="safety-notice">

                    <div className="notice-check">
                        ✓
                    </div>

                    <div>

                        <strong>
                            Emergency response
                        </strong>

                        <p>
                            When you activate SOS, SafeHer
                            records your current location,
                            calculates the safety risk, creates
                            an emergency event, and sends an
                            email notification to your saved
                            emergency contacts.
                        </p>

                        <p>
                            Police and ambulance services are
                            not directly integrated in this MVP.
                            SafeHer is designed to provide an
                            additional emergency communication
                            layer for trusted contacts.
                        </p>

                    </div>

                </div>


            </main>

        </div>
    );
}


export default Dashboard;