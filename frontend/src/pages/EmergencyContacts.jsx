import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import {
  createContact,
  deleteContact,
  getContacts,
} from "../services/api";

import "./EmergencyContacts.css";


function getContactId(contact) {
  return contact?.id || contact?.contact_id || null;
}


function formatApiError(error, fallbackMessage) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item?.msg) {
          return String(item.msg);
        }

        return null;
      })
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  return fallbackMessage;
}


function EmergencyContacts() {
  const navigate = useNavigate();

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    relationship: "",
  });


  const loadContacts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getContacts();

      const data =
        response?.data ??
        response ??
        [];

      if (!Array.isArray(data)) {
        setContacts([]);
        return;
      }

      /*
       * Normalize every contact so the UI always has
       * one reliable ID regardless of whether the backend
       * returns `id` or `contact_id`.
       */
      const normalizedContacts = data
        .map((contact) => ({
          ...contact,
          id: getContactId(contact),
        }))
        .filter((contact) => Boolean(contact.id));

      setContacts(normalizedContacts);

    } catch (err) {
      console.error(
        "Unable to load emergency contacts:",
        err
      );

      if (err?.response?.status === 401) {
        navigate("/login");
        return;
      }

      setError(
        formatApiError(
          err,
          "Unable to load emergency contacts."
        )
      );

    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadContacts();
  }, []);


  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };


  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const name = form.name.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();
    const relationship =
      form.relationship.trim();

    if (!name || !phone || !relationship) {
      setError(
        "Name, phone number, and relationship are required."
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name,
        phone,
        relationship,
        email: email || null,
      };

      await createContact(payload);

      setForm({
        name: "",
        phone: "",
        email: "",
        relationship: "",
      });

      setSuccess(
        "Emergency contact added successfully."
      );

      await loadContacts();

    } catch (err) {
      console.error(
        "Unable to create emergency contact:",
        err
      );

      setError(
        formatApiError(
          err,
          "Unable to add emergency contact."
        )
      );

    } finally {
      setSaving(false);
    }
  };


  const handleDelete = async (contactId) => {
    setError("");
    setSuccess("");

    if (!contactId) {
      setError(
        "Unable to remove this contact because its ID is missing."
      );
      return;
    }

    try {
      setDeletingId(contactId);

      await deleteContact(contactId);

      setContacts((previous) =>
        previous.filter(
          (contact) =>
            getContactId(contact) !== contactId
        )
      );

      setSuccess(
        "Emergency contact removed successfully."
      );

    } catch (err) {
      console.error(
        "Unable to delete emergency contact:",
        err
      );

      setError(
        formatApiError(
          err,
          "Unable to remove emergency contact."
        )
      );

    } finally {
      setDeletingId(null);
    }
  };


  return (
    <div className="contacts-page">

      <div className="contacts-header">

        <div>

          <button
            type="button"
            className="contacts-back-button"
            onClick={() => navigate("/dashboard")}
          >
            ← Dashboard
          </button>

          <h1>Emergency Contacts</h1>

          <p>
            People who can be notified when you activate
            an SOS.
          </p>

        </div>

      </div>


      <div className="contacts-content">

        <section className="contacts-card">

          <div className="contacts-card-header">

            <h2>Add Emergency Contact</h2>

            <p>
              Add trusted people who should receive your
              emergency notification.
            </p>

          </div>


          <form
            className="contacts-form"
            onSubmit={handleSubmit}
          >

            <div className="contacts-form-grid">

              <div className="contacts-field">

                <label htmlFor="name">
                  Full Name
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="e.g. Mother"
                  value={form.name}
                  onChange={handleChange}
                  maxLength={100}
                  required
                />

              </div>


              <div className="contacts-field">

                <label htmlFor="relationship">
                  Relationship
                </label>

                <input
                  id="relationship"
                  name="relationship"
                  type="text"
                  placeholder="e.g. Mother"
                  value={form.relationship}
                  onChange={handleChange}
                  maxLength={50}
                  required
                />

              </div>


              <div className="contacts-field">

                <label htmlFor="phone">
                  Phone Number
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="e.g. +91 9876543210"
                  value={form.phone}
                  onChange={handleChange}
                  maxLength={20}
                  required
                />

              </div>


              <div className="contacts-field">

                <label htmlFor="email">

                  Email Address

                  <span className="contacts-optional">
                    Optional
                  </span>

                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="e.g. mother@gmail.com"
                  value={form.email}
                  onChange={handleChange}
                  maxLength={255}
                />

              </div>

            </div>


            {error && (
              <div className="contacts-message contacts-error">
                {String(error)}
              </div>
            )}


            {success && (
              <div className="contacts-message contacts-success">
                {String(success)}
              </div>
            )}


            <button
              type="submit"
              className="contacts-submit-button"
              disabled={saving}
            >
              {saving
                ? "Adding Contact..."
                : "Add Emergency Contact"}
            </button>

          </form>

        </section>


        <section className="contacts-card">

          <div className="contacts-card-header">

            <h2>Your Emergency Contacts</h2>

            <p>
              These contacts will be used for future SOS
              notification delivery.
            </p>

          </div>


          {loading ? (

            <div className="contacts-empty-state">
              Loading emergency contacts...
            </div>

          ) : contacts.length === 0 ? (

            <div className="contacts-empty-state">

              <div className="contacts-empty-icon">
                👥
              </div>

              <h3>
                No emergency contacts yet
              </h3>

              <p>
                Add at least one trusted contact so your
                SOS system knows who to notify.
              </p>

            </div>

          ) : (

            <div className="contacts-list">

              {contacts.map((contact) => {

                const contactId =
                  getContactId(contact);

                return (
                  <div
                    className="contact-item"
                    key={contactId}
                  >

                    <div className="contact-avatar">
                      {contact.name
                        ?.charAt(0)
                        ?.toUpperCase() || "?"}
                    </div>


                    <div className="contact-information">

                      <div className="contact-name-row">

                        <h3>
                          {contact.name}
                        </h3>

                        <span className="contact-relationship">
                          {contact.relationship}
                        </span>

                      </div>


                      <div className="contact-details">

                        <span>
                          📞 {contact.phone}
                        </span>

                        {contact.email && (
                          <span>
                            ✉️ {contact.email}
                          </span>
                        )}

                      </div>

                    </div>


                    <button
                      type="button"
                      className="contact-delete-button"
                      onClick={() =>
                        handleDelete(contactId)
                      }
                      disabled={
                        !contactId ||
                        deletingId === contactId
                      }
                    >
                      {deletingId === contactId
                        ? "Removing..."
                        : "Remove"}
                    </button>

                  </div>
                );
              })}

            </div>

          )}

        </section>


        <section className="contacts-info-card">

          <div className="contacts-info-icon">
            🛡️
          </div>

          <div>

            <h3>
              How this works
            </h3>

            <p>
              When you activate SOS, SafeHer will capture
              your current location and safety risk, create
              an emergency event, and use these saved
              contacts for notification delivery.
            </p>

            <p>
              Your contact information is stored securely
              in the SafeHer database and is associated
              only with your account.
            </p>

          </div>

        </section>

      </div>

    </div>
  );
}


export default EmergencyContacts;