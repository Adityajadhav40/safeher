import {
    useEffect,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import {
    clearAuth,
    getSavedUser,
} from "../services/api";

import "./Settings.css";


const SETTINGS_STORAGE_KEY =
    "safeher_settings";


const DEFAULT_SETTINGS = {
    locationEnabled: true,
    safetyAssessment: true,
    emergencyEmail: true,
};


function loadSettings() {
    try {
        const stored =
            localStorage.getItem(
                SETTINGS_STORAGE_KEY
            );

        if (!stored) {
            return DEFAULT_SETTINGS;
        }

        const parsed =
            JSON.parse(stored);

        return {
            ...DEFAULT_SETTINGS,
            ...parsed,
        };
    } catch {
        return DEFAULT_SETTINGS;
    }
}


function Toggle({
    checked,
    onChange,
    label,
}) {
    return (
        <button
            type="button"
            className={`settings-toggle ${
                checked
                    ? "active"
                    : ""
            }`}
            onClick={onChange}
            aria-label={label}
            aria-pressed={checked}
        >
            <span className="settings-toggle-track">
                <span className="settings-toggle-thumb" />
            </span>
        </button>
    );
}


function Settings() {
    const navigate = useNavigate();

    const [settings, setSettings] =
        useState(loadSettings);

    const [saved, setSaved] =
        useState(false);

    const user =
        getSavedUser();


    /* =====================================================
       SAVE SETTINGS
    ===================================================== */

    useEffect(() => {
        localStorage.setItem(
            SETTINGS_STORAGE_KEY,
            JSON.stringify(settings)
        );

        setSaved(true);

        const timer =
            setTimeout(() => {
                setSaved(false);
            }, 1200);

        return () =>
            clearTimeout(timer);
    }, [settings]);


    /* =====================================================
       UPDATE SETTING
    ===================================================== */

    const updateSetting = (
        key
    ) => {
        setSettings(
            (current) => ({
                ...current,
                [key]:
                    !current[key],
            })
        );
    };


    /* =====================================================
       LOGOUT
    ===================================================== */

    const handleLogout = () => {
        clearAuth();

        navigate(
            "/login",
            {
                replace: true,
            }
        );
    };


    return (
        <div className="settings-page">

            {/* =================================================
                TOP BAR
            ================================================= */}

            <div className="settings-topbar">

                <button
                    type="button"
                    className="settings-back-button"
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
                HEADER
            ================================================= */}

            <header className="settings-header">

                <div>

                    <div className="settings-eyebrow">
                        APPLICATION
                    </div>

                    <h1>
                        Settings
                    </h1>

                    <p>
                        Manage your SafeHer
                        preferences and account
                        options.
                    </p>

                </div>


                <div
                    className={`settings-saved ${
                        saved
                            ? "visible"
                            : ""
                    }`}
                >
                    ✓ Preferences saved
                </div>

            </header>


            <main className="settings-content">

                {/* =================================================
                    SAFETY PREFERENCES
                ================================================= */}

                <section className="settings-card">

                    <div className="settings-card-heading">

                        <div>
                            <div className="settings-card-eyebrow">
                                SAFETY
                            </div>

                            <h2>
                                Safety preferences
                            </h2>

                            <p>
                                Control how SafeHer
                                behaves while you use
                                the application.
                            </p>
                        </div>

                    </div>


                    <div className="settings-list">

                        {/* LOCATION */}

                        <div className="settings-row">

                            <div className="settings-row-icon location">
                                ◎
                            </div>


                            <div className="settings-row-content">

                                <strong>
                                    Location access
                                </strong>

                                <span>
                                    Allow SafeHer to use
                                    your browser location
                                    when checking district
                                    safety.
                                </span>

                            </div>


                            <Toggle
                                checked={
                                    settings.locationEnabled
                                }
                                onChange={() =>
                                    updateSetting(
                                        "locationEnabled"
                                    )
                                }
                                label="Toggle location access preference"
                            />

                        </div>


                        {/* SAFETY ASSESSMENT */}

                        <div className="settings-row">

                            <div className="settings-row-icon safety">
                                !
                            </div>


                            <div className="settings-row-content">

                                <strong>
                                    Safety assessment
                                </strong>

                                <span>
                                    Enable safety risk
                                    assessment when your
                                    location is checked.
                                </span>

                            </div>


                            <Toggle
                                checked={
                                    settings.safetyAssessment
                                }
                                onChange={() =>
                                    updateSetting(
                                        "safetyAssessment"
                                    )
                                }
                                label="Toggle safety assessment preference"
                            />

                        </div>


                        {/* EMAIL */}

                        <div className="settings-row">

                            <div className="settings-row-icon email">
                                @
                            </div>


                            <div className="settings-row-content">

                                <strong>
                                    Emergency email
                                    notifications
                                </strong>

                                <span>
                                    SafeHer can send SOS
                                    notifications to the
                                    emergency contacts saved
                                    on your account.
                                </span>

                            </div>


                            <Toggle
                                checked={
                                    settings.emergencyEmail
                                }
                                onChange={() =>
                                    updateSetting(
                                        "emergencyEmail"
                                    )
                                }
                                label="Toggle emergency email preference"
                            />

                        </div>

                    </div>

                </section>


                {/* =================================================
                    ACCOUNT
                ================================================= */}

                <section className="settings-card">

                    <div className="settings-card-heading">

                        <div>

                            <div className="settings-card-eyebrow">
                                ACCOUNT
                            </div>

                            <h2>
                                Account settings
                            </h2>

                            <p>
                                View your account
                                information and manage
                                your SafeHer profile.
                            </p>

                        </div>

                    </div>


                    <div className="settings-action-list">

                        <button
                            type="button"
                            className="settings-action"
                            onClick={() =>
                                navigate(
                                    "/profile"
                                )
                            }
                        >

                            <div className="settings-action-icon profile">
                                A
                            </div>

                            <div>
                                <strong>
                                    My Profile
                                </strong>

                                <span>
                                    {user?.email ||
                                        "View your account information"}
                                </span>
                            </div>

                            <b>
                                →
                            </b>

                        </button>


                        <button
                            type="button"
                            className="settings-action"
                            onClick={() =>
                                navigate(
                                    "/contacts"
                                )
                            }
                        >

                            <div className="settings-action-icon contacts">
                                ♧
                            </div>

                            <div>
                                <strong>
                                    Emergency Contacts
                                </strong>

                                <span>
                                    Manage people who
                                    receive SOS emails.
                                </span>
                            </div>

                            <b>
                                →
                            </b>

                        </button>

                    </div>

                </section>


                {/* =================================================
                    CURRENT ACCOUNT
                ================================================= */}

                <section className="settings-account-card">

                    <div className="settings-account-icon">
                        ✓
                    </div>


                    <div className="settings-account-info">

                        <div className="settings-card-eyebrow">
                            CURRENT ACCOUNT
                        </div>

                        <h3>
                            {user?.full_name ||
                                "SafeHer User"}
                        </h3>

                        <p>
                            {user?.email ||
                                "Authenticated SafeHer account"}
                        </p>

                    </div>

                    <span className="settings-account-status">
                        Active
                    </span>

                </section>


                {/* =================================================
                    APPLICATION INFORMATION
                ================================================= */}

                <section className="settings-card">

                    <div className="settings-card-heading">

                        <div>

                            <div className="settings-card-eyebrow">
                                ABOUT SAFEHER
                            </div>

                            <h2>
                                Application information
                            </h2>

                        </div>

                    </div>


                    <div className="settings-info-grid">

                        <div>
                            <span>
                                Application
                            </span>

                            <strong>
                                SafeHer
                            </strong>
                        </div>


                        <div>
                            <span>
                                Platform
                            </span>

                            <strong>
                                Maharashtra Women Safety
                            </strong>
                        </div>


                        <div>
                            <span>
                                Risk engine
                            </span>

                            <strong>
                                Historical ML analysis
                            </strong>
                        </div>


                        <div>
                            <span>
                                Notification provider
                            </span>

                            <strong>
                                Email / Resend
                            </strong>
                        </div>

                    </div>

                </section>


                {/* =================================================
                    IMPORTANT INFORMATION
                ================================================= */}

                <section className="settings-information-card">

                    <div className="settings-information-icon">
                        i
                    </div>


                    <div>

                        <h3>
                            Important safety information
                        </h3>

                        <p>
                            SafeHer is an additional
                            emergency communication and
                            location-awareness layer. Its
                            risk score is based on historical
                            crime data and machine-learning
                            predictions and should not be
                            treated as a real-time guarantee
                            of safety.
                        </p>

                    </div>

                </section>


                {/* =================================================
                    LOGOUT
                ================================================= */}

                <section className="settings-logout-card">

                    <div>

                        <h3>
                            Sign out
                        </h3>

                        <p>
                            Sign out of your SafeHer
                            account on this device.
                        </p>

                    </div>


                    <button
                        type="button"
                        className="settings-logout-button"
                        onClick={
                            handleLogout
                        }
                    >
                        Sign out
                    </button>

                </section>

            </main>

        </div>
    );
}


export default Settings;