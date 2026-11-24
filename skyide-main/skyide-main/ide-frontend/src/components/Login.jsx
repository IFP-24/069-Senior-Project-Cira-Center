// ide-frontend/src/components/Login.jsx
import React, { useState } from "react"
import { useAuth } from "../context/AuthContext.jsx"
import "../styles/auth.css"

export default function Login({ onToggleMode, onClose }) {
    const { login } = useAuth()
    const [formData, setFormData] = useState({
        username: "",
        password: ""
    })
    const [errors, setErrors] = useState({})
    const [loading, setLoading] = useState(false)

    const handleChange = e => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        if (errors[name] || errors.general) {
            setErrors(prev => ({
                ...prev,
                [name]: "",
                general: ""
            }))
        }
    }

    const handleSubmit = async e => {
        e.preventDefault()
        setLoading(true)
        setErrors({})

        const result = await login(formData.username, formData.password)

        if (result.success) {
            onClose()
        } else {
            setErrors({ general: result.error || "Unable to log in." })
        }

        setLoading(false)
    }

    return (
        <div className="auth-form">
            <h2>Login</h2>

            {errors.general && <div className="error-message">{errors.general}</div>}

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="username">Username</label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                        placeholder="Enter your username"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        placeholder="Enter your password"
                    />
                </div>

                <button type="submit" disabled={loading} className="auth-button">
                    {loading ? "Logging in..." : "Login"}
                </button>
            </form>

            <p className="auth-toggle">
                Don't have an account?{" "}
                <button
                    type="button"
                    onClick={onToggleMode}
                    className="link-button link-button-signup"
                >
                    Sign up
                </button>
            </p>
        </div>
    )
}
