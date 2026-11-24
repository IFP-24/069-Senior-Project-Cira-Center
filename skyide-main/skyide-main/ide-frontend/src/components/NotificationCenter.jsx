// ide-frontend/src/components/NotificationCenter.jsx
import React from "react"

const NotificationCenter = ({ notifications, onRemove }) => {
    // Add error handling for missing props
    if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
        return null
    }

    if (typeof onRemove !== "function") {
        console.warn("NotificationCenter: onRemove prop must be a function")
        return null
    }

    return (
        <div
            style={{
                position: "fixed",
                top: "20px",
                right: "20px",
                zIndex: 9999,
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                maxWidth: "400px"
            }}
        >
            {notifications
                .map((notification, index) => {
                    // Handle malformed notifications gracefully
                    if (!notification) return null

                    // Ensure each notification has a unique key
                    const key = notification.id || notification.timestamp || index
                    return (
                        <NotificationItem
                            key={key}
                            notification={notification}
                            onRemove={() => onRemove && onRemove(notification.id || key)}
                        />
                    )
                })
                .filter(Boolean)}
        </div>
    )
}

const NotificationItem = ({ notification, onRemove }) => {
    // Add error handling for malformed notification objects
    if (!notification || typeof notification !== "object") {
        console.warn("Invalid notification object:", notification)
        return null
    }

    const getStyles = type => {
        const baseStyles = {
            padding: "12px 16px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            minWidth: "300px",
            animation: "slideIn 0.3s ease-out",
            cursor: "pointer",
            border: "1px solid"
        }

        const typeStyles = {
            success: {
                background: "#d4edda",
                borderColor: "#c3e6cb",
                color: "#155724"
            },
            error: {
                background: "#f8d7da",
                borderColor: "#f5c6cb",
                color: "#721c24"
            },
            warning: {
                background: "#fff3cd",
                borderColor: "#ffeaa7",
                color: "#856404"
            },
            info: {
                background: "#d1ecf1",
                borderColor: "#bee5eb",
                color: "#0c5460"
            }
        }

        return { ...baseStyles, ...typeStyles[type] }
    }

    const getIcon = type => {
        const icons = {
            success: "✅",
            error: "❌",
            warning: "⚠️",
            info: "ℹ️"
        }
        return icons[type] || "ℹ️"
    }

    // Get the text to display - handle both title and message
    const getDisplayText = () => {
        if (notification.title && notification.message) {
            return (
                <div>
                    <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                        {notification.title}
                    </div>
                    <div style={{ fontSize: "14px", opacity: 0.9 }}>{notification.message}</div>
                </div>
            )
        }
        return notification.title || notification.message || "Notification"
    }

    return (
        <div
            style={getStyles(notification.type || "info")}
            onClick={onRemove}
            title="Click to dismiss"
        >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "16px" }}>{getIcon(notification.type || "info")}</span>
                <div style={{ fontWeight: "500" }}>{getDisplayText()}</div>
            </div>
            <button
                onClick={e => {
                    e.stopPropagation()
                    onRemove()
                }}
                style={{
                    background: "none",
                    border: "none",
                    fontSize: "18px",
                    cursor: "pointer",
                    opacity: 0.6,
                    marginLeft: "10px"
                }}
            >
                ×
            </button>

            <style>{`
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    )
}

export default NotificationCenter
