// ide-frontend/src/components/AuthModal.jsx
import React, { useState } from "react"
import Login from "./Login.jsx"
import Register from "./Register.jsx"
import "../styles/auth.css"

export default function AuthModal({ isOpen, onClose }) {
    const [isLogin, setIsLogin] = useState(true)

    if (!isOpen) return null

    const toggleMode = () => {
        setIsLogin(!isLogin)
    }

    return (
        <div
            className="modal-overlay"
            data-testid="modal-overlay"
            onMouseDown={e => {
                if (e.target === e.currentTarget) {
                    onClose()
                }
            }}
        >
            <div className="modal-content">
                <button className="modal-close" onClick={onClose}>
                    x
                </button>

                {isLogin ? (
                    <Login onToggleMode={toggleMode} onClose={onClose} />
                ) : (
                    <Register onToggleMode={toggleMode} onClose={onClose} />
                )}
            </div>
        </div>
    )
}
