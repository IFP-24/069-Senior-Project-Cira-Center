import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../src/context/AuthContext.jsx"
import "../src/styles/auth.css"
import "../src/styles/profile.css"

export default function ProfilePage() {
    const { user, getExistingProjects } = useAuth()
    const navigate = useNavigate()
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchProjects = async () => {
            if (user) {
                const result = await getExistingProjects()
                if (result.success) {
                    setProjects(result.projects)
                }
            }
            setLoading(false)
        }
        fetchProjects()
    }, [user, getExistingProjects])

    const handleProjectClick = (projectName) => {
        navigate(`/editor?project=${encodeURIComponent(projectName)}`)
    }

    if (!user) {
        return (
            <div className="profile-page">
                <div className="profile-container">
                    <h2>Please log in to view your profile.</h2>
                </div>
            </div>
        )
    }

    return (
        <div className="profile-page">
            <div className="profile-header">
                <h1 className="profile-title">My Profile</h1>
            </div>

            <div className="profile-content">
                {/* User Info Card */}
                <div className="profile-card">
                    <h2 className="card-title">Account Details</h2>
                    <div className="account-details-grid">
                        <div className="info-group">
                            <div className="info-label">Username</div>
                            <div className="info-value">{user.username}</div>
                        </div>
                        {user.email && (
                            <div className="info-group">
                                <div className="info-label">Email</div>
                                <div className="info-value">{user.email}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Projects Card */}
                <div className="profile-card">
                    <h2 className="card-title">My Projects</h2>
                    {loading ? (
                        <p>Loading projects...</p>
                    ) : projects.length > 0 ? (
                        <div className="projects-grid">
                            {projects.map((project) => (
                                <div
                                    key={project}
                                    className="project-card"
                                    onClick={() => handleProjectClick(project)}
                                >
                                    <h3 className="project-name">{project}</h3>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="empty-projects">No projects found. Go to the editor to create one!</p>
                    )}
                </div>
            </div>
        </div>
    )
}
