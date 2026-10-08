import {
    useEffect,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import {
    createContact,
    deleteContact,
    getContacts,
} from "../services/api";

import "./EmergencyContacts.css";


function getInitials(name) {
    if (!name) {
        return "C";
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


function normalizeContacts(response) {
    if (Array.isArray(response)) {
        return response;
    }

    if (Array.isArray(response?.data)) {
        return response.data;
    }

    if (Array.isArray(response?.contacts)) {
        return response.contacts;
    }

    if (Array.isArray(response?.data?.contacts)) {
        return response.data.contacts;
    }

    return [];
}


function getErrorMessage(error) {
    const detail =
        error?.response?.data?.detail;

    if (Array.isArray(detail)) {
        return detail
            .map((item) =>
                item?.msg
                    ? String(item.msg)
                    : String(item)
            )
            .join(", ");
    }

    if (detail) {
        return String(detail);
    }

    if (error?.message) {
        return String(error.message);
    }

    return "Something went wrong. Please try again.";
}


function EmergencyContacts() {
    const navigate = useNavigate();


    const [contacts, setContacts] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [submitting, setSubmitting] =
        useState(false);

    const [deletingId, setDeletingId] =
        useState(null);

    const [error, setError] =
        useState("");

    const [success, setSuccess] =
        useState("");


    const [
        form,
        setForm,
    ] = useState({
        name: "",
        relationship: "",
        phone: "",
        email: "",
    });


    /* =====================================================
       LOAD CONTACTS
    ===================================================== */

    const loadContacts = async () => {
        try {
            setLoading(true);
            setError("");

            const response =
                await getContacts();

            setContacts(
                normalizeContacts(response)
            );
        } catch (requestError) {
            console.error(
                "Emergency contacts loading failed:",
                requestError
            );

            setError(
                getErrorMessage(
                    requestError
                )
            );
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        loadContacts();
    }, []);


    /* =====================================================
       FORM CHANGE
    ===================================================== */

    const handleChange = (
        event
    ) => {
        const {
            name,
            value,
        } = event.target;

        setForm(
            (current) => ({
                ...current,
                [name]: value,
            })
        );

        setError("");
        setSuccess("");
    };


    /* =====================================================
       ADD CONTACT
    ===================================================== */

    const handleSubmit = async (
        event
    ) => {
        event.preventDefault();

        setError("");
        setSuccess("");


        const name =
            form.name.trim();

        const relationship =
            form.relationship.trim();

        const phone =
            form.phone.trim();

        const email =
            form.email.trim();


        if (!name) {
            setError(
                "Please enter the contact's name."
            );
            return;
        }


        if (!relationship) {
            setError(
                "Please enter the relationship."
            );
            return;
        }


        if (!phone) {
            setError(
                "Please enter a phone number."
            );
            return;
        }


        if (
            email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                email
            )
        ) {
            setError(
                "Please enter a valid email address."
            );
            return;
        }


        try {
            setSubmitting(true);

            const response =
                await createContact({
                    name,
                    relationship,
                    phone,
                    email,
                });


            const createdContact =
                response?.data ||
                response?.contact ||
                response;


            if (
                createdContact &&
                typeof createdContact ===
                    "object" &&
                !Array.isArray(
                    createdContact
                ) &&
                (
                    createdContact.id ||
                    createdContact.name
                )
            ) {
                setContacts(
                    (current) => [
                        ...current,
                        createdContact,
                    ]
                );
            } else {
                await loadContacts();
            }


            setForm({
                name: "",
                relationship: "",
                phone: "",
                email: "",
            });


            setSuccess(
                "Emergency contact added successfully."
            );
        } catch (requestError) {
            console.error(
                "Emergency contact creation failed:",
                requestError
            );

            setError(
                getErrorMessage(
                    requestError
                )
            );
        } finally {
            setSubmitting(false);
        }
    };


    /* =====================================================
       DELETE CONTACT
    ===================================================== */

    const handleDelete = async (
        contact
    ) => {
        const contactId =
            contact?.id ||
            contact?.contact_id;


        if (!contactId) {
            setError(
                "Unable to identify this contact."
            );
            return;
        }


        const confirmed =
            window.confirm(
                `Remove ${contact.name || "this contact"} from your emergency contacts?`
            );


        if (!confirmed) {
            return;
        }


        try {
            setDeletingId(
                contactId
            );

            setError("");
            setSuccess("");


            await deleteContact(
                contactId
            );


            setContacts(
                (current) =>
                    current.filter(
                        (item) =>
                            item.id !==
                                contactId &&
                            item.contact_id !==
                                contactId
                    )
            );


            setSuccess(
                "Emergency contact removed."
            );
        } catch (requestError) {
            console.error(
                "Emergency contact deletion failed:",
                requestError
            );

            setError(
                getErrorMessage(
                    requestError
                )
            );
        } finally {
            setDeletingId(null);
        }
    };


    return (
        <div className="contacts-page">

            {/* =================================================
                TOP BAR
            ================================================= */}

            <div className="contacts-topbar">

                <button
                    type="button"
                    className="contacts-back-button"
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

            <header className="contacts-header">

                <div>

                    <div className="contacts-eyebrow">
                        EMERGENCY RESPONSE
                    </div>

                    <h1>
                        Emergency Contacts
                    </h1>

                    <p>
                        People who can be notified
                        when you activate an SOS.
                    </p>

                </div>


                <div className="contacts-count-badge">

                    <strong>
                        {contacts.length}
                    </strong>

                    <span>
                        saved
                    </span>

                </div>

            </header>


            {/* =================================================
                MESSAGES
            ================================================= */}

            {error && (
                <div className="contacts-message error">

                    <strong>
                        Unable to complete request
                    </strong>

                    <span>
                        {String(error)}
                    </span>

                </div>
            )}


            {success && (
                <div className="contacts-message success">

                    <strong>
                        ✓
                    </strong>

                    <span>
                        {success}
                    </span>

                </div>
            )}


            <main className="contacts-content">

                {/* =================================================
                    ADD CONTACT
                ================================================= */}

                <section className="contacts-card">

                    <div className="contacts-card-heading">

                        <div>

                            <div className="contacts-card-eyebrow">
                                ADD CONTACT
                            </div>

                            <h2>
                                Add a trusted person
                            </h2>

                            <p>
                                This person can receive
                                emergency notifications
                                when you activate SOS.
                            </p>

                        </div>

                    </div>


                    <form
                        className="contacts-form"
                        onSubmit={
                            handleSubmit
                        }
                    >

                        <div className="contacts-form-grid">

                            <div className="contacts-field">

                                <label htmlFor="contact-name">
                                    Full name
                                </label>

                                <input
                                    id="contact-name"
                                    name="name"
                                    type="text"
                                    value={
                                        form.name
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. Mother"
                                    autoComplete="name"
                                    maxLength={100}
                                />

                            </div>


                            <div className="contacts-field">

                                <label htmlFor="contact-relationship">
                                    Relationship
                                </label>

                                <input
                                    id="contact-relationship"
                                    name="relationship"
                                    type="text"
                                    value={
                                        form.relationship
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. Mother"
                                    maxLength={50}
                                />

                            </div>


                            <div className="contacts-field">

                                <label htmlFor="contact-phone">
                                    Phone number
                                </label>

                                <input
                                    id="contact-phone"
                                    name="phone"
                                    type="tel"
                                    value={
                                        form.phone
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="+91 9876543210"
                                    autoComplete="tel"
                                    maxLength={20}
                                />

                            </div>


                            <div className="contacts-field">

                                <label htmlFor="contact-email">
                                    Email address
                                    <span>
                                        Optional
                                    </span>
                                </label>

                                <input
                                    id="contact-email"
                                    name="email"
                                    type="email"
                                    value={
                                        form.email
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. mother@gmail.com"
                                    autoComplete="email"
                                    maxLength={255}
                                />

                            </div>

                        </div>


                        <div className="contacts-form-footer">

                            <p>
                                Email is required for
                                SOS email notification
                                delivery.
                            </p>


                            <button
                                type="submit"
                                className="contacts-add-button"
                                disabled={
                                    submitting
                                }
                            >
                                {submitting
                                    ? "Adding..."
                                    : "+ Add Emergency Contact"}
                            </button>

                        </div>

                    </form>

                </section>


                {/* =================================================
                    CONTACT LIST
                ================================================= */}

                <section className="contacts-card">

                    <div className="contacts-card-heading contacts-list-heading">

                        <div>

                            <div className="contacts-card-eyebrow">
                                YOUR CONTACTS
                            </div>

                            <h2>
                                Emergency contacts
                            </h2>

                            <p>
                                These contacts are private
                                to your account and are used
                                for future SOS notifications.
                            </p>

                        </div>

                    </div>


                    {loading ? (

                        <div className="contacts-loading">

                            <div className="contacts-spinner" />

                            <p>
                                Loading emergency
                                contacts...
                            </p>

                        </div>

                    ) : contacts.length === 0 ? (

                        <div className="contacts-empty">

                            <div className="contacts-empty-icon">
                                ♧
                            </div>

                            <h3>
                                No emergency contacts yet
                            </h3>

                            <p>
                                Add at least one trusted
                                person so SafeHer can
                                notify them when an SOS
                                is activated.
                            </p>

                        </div>

                    ) : (

                        <div className="contacts-list">

                            {contacts.map(
                                (
                                    contact,
                                    index
                                ) => {

                                    const id =
                                        contact.id ||
                                        contact.contact_id ||
                                        `contact-${index}`;

                                    return (
                                        <article
                                            className="contact-item"
                                            key={id}
                                        >

                                            <div className="contact-avatar">
                                                {getInitials(
                                                    contact.name
                                                )}
                                            </div>


                                            <div className="contact-main">

                                                <div className="contact-name-row">

                                                    <h3>
                                                        {contact.name ||
                                                            "Unnamed contact"}
                                                    </h3>

                                                    {contact.relationship && (
                                                        <span className="contact-relationship">
                                                            {
                                                                contact.relationship
                                                            }
                                                        </span>
                                                    )}

                                                </div>


                                                <div className="contact-details">

                                                    <a
                                                        href={`tel:${contact.phone}`}
                                                        className="contact-detail phone"
                                                    >
                                                        <span>
                                                            ☎
                                                        </span>

                                                        {
                                                            contact.phone ||
                                                            "No phone number"
                                                        }
                                                    </a>


                                                    {contact.email ? (
                                                        <a
                                                            href={`mailto:${contact.email}`}
                                                            className="contact-detail email"
                                                        >
                                                            <span>
                                                                @
                                                            </span>

                                                            {
                                                                contact.email
                                                            }
                                                        </a>
                                                    ) : (
                                                        <span className="contact-detail unavailable">
                                                            <span>
                                                                @
                                                            </span>

                                                            Email not provided
                                                        </span>
                                                    )}

                                                </div>

                                            </div>


                                            <button
                                                type="button"
                                                className="contact-remove-button"
                                                onClick={() =>
                                                    handleDelete(
                                                        contact
                                                    )
                                                }
                                                disabled={
                                                    deletingId ===
                                                    (
                                                        contact.id ||
                                                        contact.contact_id
                                                    )
                                                }
                                            >
                                                {deletingId ===
                                                (
                                                    contact.id ||
                                                    contact.contact_id
                                                )
                                                    ? "Removing..."
                                                    : "Remove"}
                                            </button>

                                        </article>
                                    );
                                }
                            )}

                        </div>

                    )}

                </section>


                {/* =================================================
                    INFORMATION
                ================================================= */}

                <section className="contacts-info-card">

                    <div className="contacts-info-icon">
                        i
                    </div>


                    <div>

                        <h3>
                            How emergency contacts work
                        </h3>

                        <p>
                            When you activate SOS, SafeHer
                            records your location and safety
                            assessment, creates an emergency
                            event, and attempts to send an
                            email notification to the saved
                            contacts that have an email
                            address.
                        </p>

                        <p>
                            SafeHer does not directly contact
                            police or ambulance services in
                            this MVP.
                        </p>

                    </div>

                </section>

            </main>

        </div>
    );
}


export default EmergencyContacts;