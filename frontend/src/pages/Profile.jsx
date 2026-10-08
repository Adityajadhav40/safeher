import {
    useEffect,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import {
    getContacts,
    getCurrentUser,
} from "../services/api";

import "./Profile.css";


function formatDate(value) {
    if (!value) {
        return "--";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "--";
    }

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }
    );
}


function getInitials(name) {
    if (!name) {
        return "U";
    }

    const parts =
        String(name)
            .trim()
            .split(/\s+/)
            .filter(Boolean);

    if (parts.length === 1) {
        return parts[0]
            .charAt(0)
            .toUpperCase();
    }

    return (
        parts[0].charAt(0) +
        parts[parts.length - 1].charAt(0)
    ).toUpperCase();
}


function Profile() {
    const navigate = useNavigate();

    const [user, setUser] =
        useState(null);

    const [contactCount, setContactCount] =
        useState(0);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");


    useEffect(() => {
        let mounted = true;

        const loadProfile = async () => {
            try {
                setLoading(true);
                setError("");

                const [
                    currentUser,
                    contacts,
                ] = await Promise.all([
                    getCurrentUser(),
                    getContacts(),
                ]);

                if (!mounted) {
                    return;
                }

                setUser(currentUser);

                const contactList =
                    Array.isArray(contacts)
                        ? contacts
                        : contacts?.data;

                setContactCount(
                    Array.isArray(contactList)
                        ? contactList.length
                        : 0
                );
            } catch (requestError) {
                console.error(
                    "Profile loading failed:",
                    requestError
                );

                if (!mounted) {
                    return;
                }

                setError(
                    requestError?.response?.data?.detail ||
                    requestError?.message ||
                    "Unable to load your profile."
                );
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        loadProfile();

        return () => {
            mounted = false;
        };
    }, []);


    if (loading) {
        return (
            <div className="profile-page">

                <div className="profile-topbar">
                    <button
                        type="button"
                        className="profile-back-button"
                        onClick={() =>
                            navigate("/dashboard")
                        }
                    >
                        ← Back to Dashboard
                    </button>
                </div>

                <main className="profile-content">

                    <div className="profile-loading-card">
                        <div className="profile-loading-spinner" />

                        <p>
                            Loading your profile...
                        </p>
                    </div>

                </main>

            </div>
        );
    }


    return (
        <div className="profile-page">

            {/* =================================================
                TOP BAR
            ================================================= */}

            <div className="profile-topbar">

                <button
                    type="button"
                    className="profile-back-button"
                    onClick={() =>
                        navigate("/dashboard")
                    }
                >
                    ← Back to Dashboard
                </button>

            </div>


            {/* =================================================
                PAGE HEADER
            ================================================= */}

            <header className="profile-header">

                <div>

                    <div className="profile-eyebrow">
                        PERSONAL SAFETY
                    </div>

                    <h1>
                        My Profile
                    </h1>

                    <p>
                        Manage your SafeHer account
                        information and view your
                        safety profile.
                    </p>

                </div>

            </header>


            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
                <div className="profile-error">
                    <strong>
                        Unable to load profile
                    </strong>

                    <span>
                        {String(error)}
                    </span>
                </div>
            )}


            <main className="profile-content">

                {/* =================================================
                    PROFILE HERO
                ================================================= */}

                <section className="profile-card profile-hero-card">

                    <div className="profile-avatar">
                        {getInitials(
                            user?.full_name
                        )}
                    </div>


                    <div className="profile-hero-info">

                        <div className="profile-name-row">

                            <h2>
                                {user?.full_name ||
                                    "SafeHer User"}
                            </h2>

                            <span className="profile-status">
                                <span />
                                Active account
                            </span>

                        </div>


                        <p className="profile-email">
                            {user?.email ||
                                "--"}
                        </p>


                        <p className="profile-member">
                            SafeHer member since{" "}
                            <strong>
                                {formatDate(
                                    user?.created_at
                                )}
                            </strong>
                        </p>

                    </div>

                </section>


                {/* =================================================
                    ACCOUNT INFORMATION
                ================================================= */}

                <section className="profile-card">

                    <div className="profile-card-heading">

                        <div>
                            <div className="profile-card-eyebrow">
                                ACCOUNT
                            </div>

                            <h2>
                                Personal information
                            </h2>
                        </div>

                    </div>


                    <div className="profile-details-grid">

                        <div className="profile-detail">

                            <span>
                                Full name
                            </span>

                            <strong>
                                {user?.full_name ||
                                    "--"}
                            </strong>

                        </div>


                        <div className="profile-detail">

                            <span>
                                Email address
                            </span>

                            <strong>
                                {user?.email ||
                                    "--"}
                            </strong>

                        </div>


                        <div className="profile-detail">

                            <span>
                                Phone number
                            </span>

                            <strong>
                                {user?.phone ||
                                    "Not provided"}
                            </strong>

                        </div>


                        <div className="profile-detail">

                            <span>
                                Account status
                            </span>

                            <strong className="status-text">
                                {user?.is_active
                                    ? "Active"
                                    : "Inactive"}
                            </strong>

                        </div>

                    </div>

                </section>


                {/* =================================================
                    SAFETY PROFILE
                ================================================= */}

                <section className="profile-card">

                    <div className="profile-card-heading">

                        <div>
                            <div className="profile-card-eyebrow">
                                SAFETY PROFILE
                            </div>

                            <h2>
                                Your SafeHer setup
                            </h2>
                        </div>

                    </div>


                    <div className="profile-safety-grid">

                        <button
                            type="button"
                            className="profile-safety-item"
                            onClick={() =>
                                navigate(
                                    "/contacts"
                                )
                            }
                        >

                            <div className="profile-safety-icon contacts">
                                ♧
                            </div>

                            <div>
                                <strong>
                                    Emergency contacts
                                </strong>

                                <span>
                                    {contactCount}{" "}
                                    saved contact
                                    {contactCount === 1
                                        ? ""
                                        : "s"}
                                </span>
                            </div>

                            <b>
                                →
                            </b>

                        </button>


                        <button
                            type="button"
                            className="profile-safety-item"
                            onClick={() =>
                                navigate(
                                    "/safety-map"
                                )
                            }
                        >

                            <div className="profile-safety-icon location">
                                ◎
                            </div>

                            <div>
                                <strong>
                                    Safety Map
                                </strong>

                                <span>
                                    Check your current
                                    district risk
                                </span>
                            </div>

                            <b>
                                →
                            </b>

                        </button>


                        <button
                            type="button"
                            className="profile-safety-item"
                            onClick={() =>
                                navigate(
                                    "/sos"
                                )
                            }
                        >

                            <div className="profile-safety-icon sos">
                                !
                            </div>

                            <div>
                                <strong>
                                    Emergency SOS
                                </strong>

                                <span>
                                    Record and manage
                                    emergency events
                                </span>
                            </div>

                            <b>
                                →
                            </b>

                        </button>


                        <button
                            type="button"
                            className="profile-safety-item"
                            onClick={() =>
                                navigate(
                                    "/settings"
                                )
                            }
                        >

                            <div className="profile-safety-icon settings">
                                ⚙
                            </div>

                            <div>
                                <strong>
                                    Settings
                                </strong>

                                <span>
                                    Manage application
                                    preferences
                                </span>
                            </div>

                            <b>
                                →
                            </b>

                        </button>

                    </div>

                </section>


                {/* =================================================
                    SECURITY INFORMATION
                ================================================= */}

                <section className="profile-security-card">

                    <div className="profile-security-icon">
                        ✓
                    </div>


                    <div>

                        <h3>
                            Your account is protected
                        </h3>

                        <p>
                            SafeHer uses authenticated
                            access and stores your
                            account and emergency
                            information securely.
                            Your emergency contacts are
                            associated with your account
                            and are not visible to other
                            users.
                        </p>

                    </div>

                </section>

            </main>

        </div>
    );
}


export default Profile;