// ide-frontend/src/components/Register.jsx
import React, { useState, useRef } from "react"
import { useAuth } from "../context/AuthContext.jsx"
import "../styles/auth.css"

export default function Register({ onToggleMode, onClose }) {
    const { register } = useAuth()
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: ""
    })
    const [errors, setErrors] = useState({})
    const [loading, setLoading] = useState(false)
    const isSubmittingRef = useRef(false)
    const submitCountRef = useRef(0)

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

    const validateForm = () => {
        const newErrors = {}

        if (formData.username.length < 3) {
            newErrors.username = "Username must be at least 3 characters long"
        }

        if (formData.email != "") {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                newErrors.email = "Please enter a valid email address"
            }
        }

        if (formData.password.length < 6) {
            newErrors.password = "Password must be at least 6 characters long"
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match"
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async e => {
        e.preventDefault()

        if (!validateForm()) return

        // Enhanced submission guard with counter
        if (loading || isSubmittingRef.current || submitCountRef.current > 0) {
            e.stopPropagation()
            return
        }

        // Increment counter immediately and synchronously
        submitCountRef.current += 1
        isSubmittingRef.current = true
        setLoading(true)
        setErrors({})

        try {
            const result = await register(formData.username, formData.email, formData.password)

            if (result.success) {
                onClose()
            } else {
                setErrors({ general: result.error || "Unable to create account." })
            }
        } finally {
            setLoading(false)
            isSubmittingRef.current = false
            // Reset counter after a small delay to prevent race conditions
            setTimeout(() => {
                submitCountRef.current = 0
            }, 100)
        }
    }

    return (
        <div className="auth-form">
            <h2>Create Account</h2>

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
                        placeholder="Choose a username"
                    />
                    {errors.username && <span className="field-error">{errors.username}</span>}
                </div>

                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter your email (Optional)"
                    />
                    {errors.email && <span className="field-error">{errors.email}</span>}
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
                        placeholder="Create a password"
                    />
                    {errors.password && <span className="field-error">{errors.password}</span>}
                </div>

                <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        placeholder="Confirm your password"
                    />
                    {errors.confirmPassword && (
                        <span className="field-error">{errors.confirmPassword}</span>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={loading || isSubmittingRef.current || submitCountRef.current > 0}
                    className="auth-button auth-button-signup"
                    onClick={e => {
                        if (loading || isSubmittingRef.current || submitCountRef.current > 0) {
                            e.preventDefault()
                            e.stopPropagation()
                        }
                    }}
                >
                    {loading ? "Creating Account..." : "Create Account"}
                </button>
            </form>

            <p className="auth-toggle">
                Already have an account?{" "}
                <button type="button" onClick={onToggleMode} className="link-button">
                    Login
                </button>
            </p>
        </div>
    )
}
