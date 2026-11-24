// ide-frontend/src/components/ConversionStatusBadge.jsx
import React from "react"

const ConversionStatusBadge = ({
    isConverting = false,
    hasRecentConversion = false,
    lastConversionTime = null,
    blockCount = 0
}) => {
    if (isConverting) {
        return (
            <div
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 8px",
                    background: "#e3f2fd",
                    color: "#1976d2",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "500",
                    border: "1px solid #bbdefb"
                }}
            >
                <div
                    style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#1976d2",
                        animation: "pulse 1.5s infinite"
                    }}
                />
                Converting...
                <style>{`
                    @keyframes pulse {
                        0%,
                        100% {
                            opacity: 1;
                        }
                        50% {
                            opacity: 0.5;
                        }
                    }
                `}</style>
            </div>
        )
    }

    if (hasRecentConversion) {
        const timeAgo = lastConversionTime ? getTimeAgo(lastConversionTime) : ""

        return (
            <div
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 8px",
                    background: "#e8f5e8",
                    color: "#2e7d32",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "500",
                    border: "1px solid #c8e6c9",
                    cursor: "pointer"
                }}
                title={`Last conversion: ${timeAgo} (${blockCount} blocks)`}
            >
                ✅ {blockCount} blocks {timeAgo && `• ${timeAgo}`}
            </div>
        )
    }

    return null
}

function getTimeAgo(timestamp) {
    if (!timestamp) return ""

    const now = new Date()
    const time = new Date(timestamp)
    const diffMs = now - time
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)

    if (diffMins < 1) return "just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return time.toLocaleDateString()
}

export default ConversionStatusBadge
