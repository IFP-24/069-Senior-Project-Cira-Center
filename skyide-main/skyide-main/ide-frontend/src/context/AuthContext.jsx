/* eslint react-refresh/only-export-components: "off" */
import React, { createContext, useCallback, useContext, useEffect, useState } from "react"
import { readJsonResponse, resolveApiBaseUrl } from "../../lib/apiBase.js"

const AuthContext = createContext()
const API_BASE = resolveApiBaseUrl()

function getErrorMessage(data, fallbackMessage) {
    return data?.error || data?.message || fallbackMessage
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    const verifyToken = useCallback(async token => {
        try {
            const response = await fetch(`${API_BASE}/auth/verify`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            })

            if (response.ok) {
                const data = await readJsonResponse(response)
                setUser(data.user)
            } else {
                localStorage.removeItem("auth_token")
            }
        } catch (error) {
            console.error("Token verification failed:", error)
            localStorage.removeItem("auth_token")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        const token = localStorage.getItem("auth_token")
        if (token) {
            verifyToken(token)
        } else {
            setLoading(false)
        }
    }, [verifyToken])

    const sendEmail = async (email, description) => {
        try {
            // eslint-disable-next-line no-unused-vars
            const response = await fetch(`${API_BASE}/auth/contact-us`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, description })
            })
        } catch (error) {
            console.log("Contact error:", error)
            return { success: false, error: "Network error. Please try again." }
        }
    }

    const login = async (username, password) => {
        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ username, password })
            })

            const data = await readJsonResponse(response)

            if (response.ok) {
                localStorage.setItem("auth_token", data.token)
                setUser(data.user)
                return { success: true }
            }

            return {
                success: false,
                error: getErrorMessage(data, "Unable to log in.")
            }
        } catch (error) {
            console.log("Login error:", error)
            return { success: false, error: "Network error. Please try again." }
        }
    }

    const register = async (username, email, password) => {
        try {
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ username, email, password })
            })

            const data = await readJsonResponse(response)

            if (response.ok) {
                localStorage.setItem("auth_token", data.token)
                setUser(data.user)
                return { success: true }
            }

            return {
                success: false,
                error: getErrorMessage(data, "Unable to create account.")
            }
        } catch (error) {
            console.log("Registration error:", error)
            return { success: false, error: "Network error. Please try again." }
        }
    }

    const getExistingProjects = async () => {
        try {
            const token = localStorage.getItem("auth_token")
            if (!token) {
                return { success: false, error: "Not authenticated" }
            }

            const response = await fetch(`${API_BASE}/auth/get-existing-projects`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            })

            const data = await readJsonResponse(response)

            if (response.ok) {
                return { success: true, projects: data.projects }
            }

            return {
                success: false,
                error: getErrorMessage(data, "Failed to fetch projects")
            }
        } catch (error) {
            console.error("Get projects error:", error)
            return { success: false, error: "Network error. Please try again." }
        }
    }

    const loadProject = async projectName => {
        try {
            const token = localStorage.getItem("auth_token")
            if (!token) {
                return { success: false, error: "Not authenticated" }
            }

            const response = await fetch(
                `${API_BASE}/auth/load-project/${encodeURIComponent(projectName)}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }
            )

            const data = await readJsonResponse(response)

            if (response.ok) {
                return { success: true, projectFile: data.projectFile }
            }

            return {
                success: false,
                error: getErrorMessage(data, "Failed to load project")
            }
        } catch (error) {
            console.error("Load project error:", error)
            return { success: false, error: "Network error. Please try again." }
        }
    }

    const saveProject = async (projectName, projectFile) => {
        try {
            const token = localStorage.getItem("auth_token")
            if (!token) {
                return { success: false, error: "Not authenticated" }
            }

            const response = await fetch(
                `${API_BASE}/auth/save-project/${encodeURIComponent(projectName)}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ projectFile })
                }
            )

            const data = await readJsonResponse(response)

            if (response.ok) {
                return { success: true, message: data.message }
            }

            return {
                success: false,
                error: getErrorMessage(data, "Failed to save project")
            }
        } catch (error) {
            console.error("Save project error:", error)
            return { success: false, error: "Network error. Please try again." }
        }
    }

    const deleteProject = async projectName => {
        try {
            const token = localStorage.getItem("auth_token")
            if (!token) {
                return { success: false, error: "Not authenticated" }
            }

            const response = await fetch(
                `${API_BASE}/auth/delete-project/${encodeURIComponent(projectName)}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }
            )

            const data = await readJsonResponse(response)

            if (response.ok) {
                return { success: true, message: data.message }
            }

            return {
                success: false,
                error: getErrorMessage(data, "Failed to delete project")
            }
        } catch (error) {
            console.error("Delete project error:", error)
            return { success: false, error: "Network error. Please try again." }
        }
    }

    const duplicateProject = async projectName => {
        try {
            const token = localStorage.getItem("auth_token")
            if (!token) {
                return { success: false, error: "Not authenticated" }
            }

            const response = await fetch(
                `${API_BASE}/auth/duplicate-project/${encodeURIComponent(projectName)}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }
            )

            const data = await readJsonResponse(response)

            if (response.ok) {
                return {
                    success: true,
                    message: data.message,
                    newProjectName: data.newProjectName
                }
            }

            return {
                success: false,
                error: getErrorMessage(data, "Failed to duplicate project")
            }
        } catch (error) {
            console.error("Duplicate project error:", error)
            return { success: false, error: "Network error. Please try again." }
        }
    }

    const renameProject = async (projectName, newProjectName) => {
        try {
            const token = localStorage.getItem("auth_token")
            if (!token) {
                return { success: false, error: "Not authenticated" }
            }

            const response = await fetch(
                `${API_BASE}/auth/rename-project/${encodeURIComponent(projectName)}`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ newProjectName })
                }
            )

            const data = await readJsonResponse(response)

            if (response.ok) {
                return { success: true, message: data.message }
            }

            return {
                success: false,
                error: getErrorMessage(data, "Failed to rename project")
            }
        } catch (error) {
            console.error("Rename project error:", error)
            return { success: false, error: "Network error. Please try again." }
        }
    }

    const logout = () => {
        localStorage.removeItem("auth_token")
        setUser(null)
    }

    const value = {
        user,
        login,
        register,
        logout,
        loading,
        getExistingProjects,
        loadProject,
        saveProject,
        deleteProject,
        duplicateProject,
        renameProject,
        sendEmail
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
