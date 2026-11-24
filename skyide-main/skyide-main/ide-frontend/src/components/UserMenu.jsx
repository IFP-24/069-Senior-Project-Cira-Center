// ide-frontend/src/components/UserMenu.jsx
import React, { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext.jsx"
import "../styles/auth.css"

export default function UserMenu() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef(null)

    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleLogout = () => {
        logout()
        setIsOpen(false)
    }

    if (!user) return null

    return (
        <div className="user-menu" ref={menuRef}>
            <button className="user-button" onClick={() => setIsOpen(!isOpen)}>
                {user.username}
                <span style={{ fontSize: "12px" }}>▼</span>
            </button>

            {isOpen && (
                <div className="user-dropdown">
                    <button
                        onClick={() => {
                            setIsOpen(false)
                            navigate("/profile")
                        }}
                    >
                        Profile
                    </button>
                    <button onClick={handleLogout} className="logout-btn">
                        Logout
                    </button>
                </div>
            )}
        </div>
    )
}
