import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
    getCurrentUser,
    loginUser,
    saveAuthToken,
    saveUser,
} from "../services/api";

import "./Login.css";


function Login() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");


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
    };


    // ========================================================
    // HANDLE LOGIN
    // ========================================================

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");

        const email = formData.email.trim();
        const password = formData.password;

        if (!email || !password) {
            setError(
                "Please enter your email and password."
            );

            return;
        }

        try {
            setLoading(true);

            const response = await loginUser({
                email,
                password,
            });

            if (!response?.access_token) {
                throw new Error(
                    "Login response did not contain an access token."
                );
            }

            saveAuthToken(
                response.access_token
            );

            /*
             * Fetch the authenticated user only
             * after the token has been saved.
             */
            const userResponse =
                await getCurrentUser();

            if (userResponse?.data) {
                saveUser(
                    userResponse.data
                );
            }

            navigate(
                "/dashboard",
                {
                    replace: true,
                }
            );

        } catch (requestError) {

            /*
             * Remove partially-created authentication
             * state if anything fails.
             */
            localStorage.removeItem(
                "safeher_access_token"
            );

            localStorage.removeItem(
                "safeher_user"
            );

            const backendMessage =
                requestError?.response?.data?.detail;

            if (requestError?.response?.status === 401) {
                setError(
                    "Invalid email or password."
                );
            } else if (backendMessage) {
                setError(
                    backendMessage
                );
            } else {
                setError(
                    "Unable to connect to the server. Please try again."
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
        <div className="login-page">

            <div className="login-card">

                <div className="login-header">

                    <div className="login-logo">
                        SH
                    </div>

                    <h1>
                        SafeHer
                    </h1>

                    <p>
                        Maharashtra Women Safety
                    </p>

                </div>


                <div className="login-content">

                    <h2>
                        Welcome back
                    </h2>

                    <p className="login-subtitle">
                        Sign in to access your safety dashboard.
                    </p>


                    {error && (
                        <div
                            className="login-error"
                            role="alert"
                        >
                            {error}
                        </div>
                    )}


                    <form
                        onSubmit={handleSubmit}
                        noValidate
                    >

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

                            <label htmlFor="password">
                                Password
                            </label>

                            <input
                                id="password"
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                disabled={loading}
                                required
                            />

                        </div>


                        <button
                            type="submit"
                            className="login-button"
                            disabled={loading}
                        >
                            {loading
                                ? "Signing in..."
                                : "Sign in"
                            }
                        </button>

                    </form>


                    <div className="login-footer">

                        <span>
                            Don't have an account?
                        </span>

                        <Link to="/register">
                            Create account
                        </Link>

                    </div>

                </div>

            </div>

        </div>
    );
}


export default Login;