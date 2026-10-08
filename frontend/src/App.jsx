import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import EmergencyContacts from "./pages/EmergencyContacts";
import SOS from "./pages/SOS";
import SafetyMap from "./pages/SafetyMap";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

import { isAuthenticated } from "./services/api";

import "./App.css";


function ProtectedRoute({
    children,
}) {
    if (!isAuthenticated()) {
        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    return children;
}


function PublicRoute({
    children,
}) {
    if (isAuthenticated()) {
        return (
            <Navigate
                to="/dashboard"
                replace
            />
        );
    }

    return children;
}


function App() {
    const authenticated =
        isAuthenticated();


    return (
        <BrowserRouter>

            <Routes>

                {/* PUBLIC */}

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


                {/* PROTECTED */}

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
                            <SafetyMap />
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
                            <Profile />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/settings"
                    element={
                        <ProtectedRoute>
                            <Settings />
                        </ProtectedRoute>
                    }
                />


                {/* DEFAULT */}

                <Route
                    path="/"
                    element={
                        <Navigate
                            to={
                                authenticated
                                    ? "/dashboard"
                                    : "/login"
                            }
                            replace
                        />
                    }
                />

                <Route
                    path="*"
                    element={
                        <Navigate
                            to={
                                authenticated
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