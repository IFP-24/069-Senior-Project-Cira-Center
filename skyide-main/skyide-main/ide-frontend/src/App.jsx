import React, { lazy, Suspense, useState } from "react"
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom"
import { AuthProvider, useAuth } from "./context/AuthContext.jsx"
import AuthModal from "./components/AuthModal.jsx"
import UserMenu from "./components/UserMenu.jsx"

const Home = lazy(() => import("../pages/Home.jsx"))
const Games = lazy(() => import("../pages/Games.jsx"))
const Help = lazy(() => import("../pages/Help.jsx"))
const Editor = lazy(() => import("../pages/Editor.jsx"))
const Login = lazy(() => import("../pages/Login.jsx"))
const SignUp = lazy(() => import("../pages/SignUp.jsx"))
const ProfilePage = lazy(() => import("../pages/ProfilePage.jsx"))
const AboutUs = lazy(() => import("../pages/About.jsx"))
const ContactUs = lazy(() => import("../pages/Contact.jsx"))

import "./index.css"
import "./App.css"

function RouteLoadingFallback() {
    return <div className="loading">Loading page...</div>
}

function AppContent() {
    const { user, loading } = useAuth()
    const [showAuthModal, setShowAuthModal] = useState(false)

    if (loading) {
        return <div className="loading">Loading...</div>
    }

    return (
        <BrowserRouter>
            <div className="app-shell">
                <header className="app-header">
                    <nav className="app-nav">
                        <NavLink to="/" className="brand">
                            <span className="brand-mark" aria-hidden="true">
                                ⧉
                            </span>
                            SkyIDE
                        </NavLink>

                        <div className="nav-links">
                            <NavLink to="/" end>
                                Home
                            </NavLink>
                            <NavLink to="/games">Games</NavLink>
                            <NavLink to="/help">Help</NavLink>
                            <NavLink to="/editor">Editor</NavLink>
                            <NavLink to="/contactus">Contact Us</NavLink>
                            <NavLink to="/aboutus">About Us</NavLink>

                            {user ? (
                                <UserMenu />
                            ) : (
                                <button
                                    className="login-button"
                                    onClick={() => setShowAuthModal(true)}
                                >
                                    Login
                                </button>
                            )}
                        </div>
                    </nav>
                </header>

                <main className="app-main">
                    <Suspense fallback={<RouteLoadingFallback />}>
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/games" element={<Games />} />
                            <Route path="/help" element={<Help />} />
                            <Route path="/editor" element={<Editor />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/signup" element={<SignUp />} />
                            <Route path="/profile" element={<ProfilePage />} />
                            <Route path="/aboutus" element={<AboutUs />} />
                            <Route path="/contactus" element={<ContactUs />} />
                        </Routes>
                    </Suspense>
                </main>

                <footer className="app-footer">
                    © 2025-26 · Cira Centre Games • Drexel/Philly Outreach
                </footer>
            </div>

            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        </BrowserRouter>
    )
}

export default function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    )
}
