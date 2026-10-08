import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { registerUser } from "../services/api";

import "./Register.css";


function Register() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        phone: "",
        password: "",
        confirm_password: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");


    // ========================================================
    // HANDLE INPUT
    // ========================================================

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));

        if (error) {
            setError("");
        }

        if (success) {
            setSuccess("");
        }
    };


    // ========================================================
    // HANDLE REGISTER
    // ========================================================

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        const fullName =
            formData.full_name.trim();

        const email =
            formData.email.trim();

        const phone =
            formData.phone.trim();

        const password =
            formData.password;

        const confirmPassword =
            formData.confirm_password;


        if (!fullName || !email || !password) {
            setError(
                "Please fill in all required fields."
            );

            return;
        }


        if (password.length < 8) {
            setError(
                "Password must contain at least 8 characters."
            );

            return;
        }


        if (password !== confirmPassword) {
            setError(
                "Passwords do not match."
            );

            return;
        }


        try {
            setLoading(true);

            await registerUser({
                full_name: fullName,
                email,
                phone: phone || null,
                password,
            });

            setSuccess(
                "Account created successfully. Redirecting to login..."
            );

            setTimeout(() => {
                navigate("/login", {
                    replace: true,
                });
            }, 1200);

        } catch (requestError) {

            const backendMessage =
                requestError?.response?.data?.detail;

            if (
                Array.isArray(backendMessage)
            ) {
                setError(
                    backendMessage
                        .map((item) => item.msg)
                        .join(" ")
                );
            } else if (backendMessage) {
                setError(
                    backendMessage
                );
            } else {
                setError(
                    "Unable to create your account. Please try again."
                );
            }

        } finally {
            setLoading(false);
        }
    };


    // ========================================================
    // UI
    // ========================================================

    return (
        <div className="register-page">

            <div className="register-card">

                <div className="register-header">

                    <div className="register-logo">
                        SH
                    </div>

                    <h1>
                        SafeHer
                    </h1>

                    <p>
                        Maharashtra Women Safety
                    </p>

                </div>


                <div className="register-content">

                    <h2>
                        Create your account
                    </h2>

                    <p className="register-subtitle">
                        Set up your secure SafeHer account.
                    </p>


                    {error && (
                        <div
                            className="register-error"
                            role="alert"
                        >
                            {error}
                        </div>
                    )}


                    {success && (
                        <div
                            className="register-success"
                            role="status"
                        >
                            {success}
                        </div>
                    )}


                    <form
                        onSubmit={handleSubmit}
                        noValidate
                    >

                        <div className="form-group">

                            <label htmlFor="full_name">
                                Full name
                            </label>

                            <input
                                id="full_name"
                                name="full_name"
                                type="text"
                                value={formData.full_name}
                                onChange={handleChange}
                                placeholder="Your full name"
                                autoComplete="name"
                                disabled={loading}
                                required
                            />

                        </div>


                        <div className="form-group">

                            <label htmlFor="email">
                                Email address
                            </label>

                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                autoComplete="email"
                                disabled={loading}
                                required
                            />

                        </div>


                        <div className="form-group">

                            <label htmlFor="phone">
                                Phone number
                                <span className="optional">
                                    Optional
                                </span>
                            </label>

                            <input
                                id="phone"
                                name="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="9876543210"
                                autoComplete="tel"
                                disabled={loading}
                            />

                        </div>


                        <div className="form-group">

                            <label htmlFor="password">
                                Password
                            </label>

                            <input
                                id="password"
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="At least 8 characters"
                                autoComplete="new-password"
                                disabled={loading}
                                required
                            />

                        </div>


                        <div className="form-group">

                            <label htmlFor="confirm_password">
                                Confirm password
                            </label>

                            <input
                                id="confirm_password"
                                name="confirm_password"
                                type="password"
                                value={formData.confirm_password}
                                onChange={handleChange}
                                placeholder="Enter password again"
                                autoComplete="new-password"
                                disabled={loading}
                                required
                            />

                        </div>


                        <button
                            type="submit"
                            className="register-button"
                            disabled={loading}
                        >
                            {loading
                                ? "Creating account..."
                                : "Create account"
                            }
                        </button>

                    </form>


                    <div className="register-footer">

                        <span>
                            Already have an account?
                        </span>

                        <Link to="/login">
                            Sign in
                        </Link>

                    </div>

                </div>

            </div>

        </div>
    );
}


export default Register;