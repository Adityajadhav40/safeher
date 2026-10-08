import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import { isAuthenticated } from "./services/api";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import EmergencyContacts from "./pages/EmergencyContacts";
import SOS from "./pages/SOS";

// ============================================================
// PLACEHOLDER PAGES
// ============================================================

function LoginPlaceholder() {
    return <div>Login Page</div>;
}


function RegisterPlaceholder() {
    return <div>Register Page</div>;
}


function DashboardPlaceholder() {
    return <div>Dashboard</div>;
}


function SafetyMapPlaceholder() {
    return <div>Safety Map</div>;
}


function EmergencyContactsPlaceholder() {
    return <div>Emergency Contacts</div>;
}


function SOSPlaceholder() {
    return <div>SOS</div>;
}


function ProfilePlaceholder() {
    return <div>Profile</div>;
}


function SettingsPlaceholder() {
    return <div>Settings</div>;
}


// ============================================================
// PROTECTED ROUTE
// ============================================================

function ProtectedRoute({ children }) {
    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }

    return children;
}


// ============================================================
// PUBLIC ROUTE
// ============================================================

function PublicRoute({ children }) {
    if (isAuthenticated()) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}


// ============================================================
// APPLICATION
// ============================================================

function App() {
    return (
        <BrowserRouter>
            <Routes>

                {/* ------------------------------------------------
                    PUBLIC ROUTES
                ------------------------------------------------ */}

                <Route
                    path="/login"
                    element={
                        <PublicRoute>
                            <Login />
                        </PublicRoute>
                    }
                />

                <Route
                    path="/register"
                    element={
                        <PublicRoute>
                            <Register />
                        </PublicRoute>
                    }
                />


                {/* ------------------------------------------------
                    PROTECTED ROUTES
                ------------------------------------------------ */}

                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/safety-map"
                    element={
                        <ProtectedRoute>
                            <SafetyMapPlaceholder />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/contacts"
                    element={
                        <ProtectedRoute>
                            <EmergencyContacts />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/sos"
                    element={
                        <ProtectedRoute>
                            <SOS />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            <ProfilePlaceholder />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/settings"
                    element={
                        <ProtectedRoute>
                            <SettingsPlaceholder />
                        </ProtectedRoute>
                    }
                />


                {/* ------------------------------------------------
                    DEFAULT ROUTE
                ------------------------------------------------ */}

                <Route
                    path="/"
                    element={
                        <Navigate
                            to={
                                isAuthenticated()
                                    ? "/dashboard"
                                    : "/login"
                            }
                            replace
                        />
                    }
                />


                {/* ------------------------------------------------
                    UNKNOWN ROUTES
                ------------------------------------------------ */}

                <Route
                    path="*"
                    element={
                        <Navigate
                            to={
                                isAuthenticated()
                                    ? "/dashboard"
                                    : "/login"
                            }
                            replace
                        />
                    }
                />

            </Routes>
        </BrowserRouter>
    );
}


export default App;