// ide-frontend/src/hooks/useNotifications.js
import { useState, useCallback } from "react"

function getDefaultDuration(type = "info") {
    return type === "error" ? 0 : 3000
}

export function useNotifications() {
    const [notifications, setNotifications] = useState([])

    const addNotification = useCallback(
        (messageOrOptions, type = "info", duration) => {
            const id = Date.now() + Math.random()
            let notification

            // Handle both object format and parameter format
            if (typeof messageOrOptions === "object" && messageOrOptions !== null) {
                // New object format: { message, type, title, autoClose }
                const options = messageOrOptions
                const resolvedType = options.type || "info"
                notification = {
                    id,
                    message: options.message || options.title || "Notification",
                    title: options.title,
                    type: resolvedType,
                    timestamp: Date.now(),
                    duration:
                        options.autoClose !== undefined
                            ? options.autoClose
                            : options.duration !== undefined
                              ? options.duration
                              : getDefaultDuration(resolvedType)
                }
            } else {
                // Legacy parameter format: (message, type, duration)
                const resolvedType = type || "info"
                notification = {
                    id,
                    message: messageOrOptions || "Notification",
                    type: resolvedType,
                    timestamp: Date.now(),
                    duration: duration !== undefined ? duration : getDefaultDuration(resolvedType)
                }
            }

            setNotifications(prev => [...prev, notification])

            // Auto-remove notification after duration
            if (notification.duration > 0) {
                setTimeout(() => {
                    removeNotification(id)
                }, notification.duration)
            }

            return id
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    )

    const removeNotification = useCallback(id => {
        setNotifications(prev => prev.filter(notif => notif.id !== id))
    }, [])

    const clearAllNotifications = useCallback(() => {
        setNotifications([])
    }, [])

    return {
        notifications,
        addNotification,
        removeNotification,
        clearAllNotifications
    }
}
