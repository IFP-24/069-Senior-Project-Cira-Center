// ide-frontend/src/components/ProgressIndicator.jsx
import React from "react"

const ProgressIndicator = ({
    isVisible,
    message = "Processing...",
    progress = null,
    type = "indeterminate"
}) => {
    if (!isVisible) return null

    return (
        <div
            style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                background: "rgba(0, 0, 0, 0.8)",
                color: "white",
                padding: "20px 30px",
                borderRadius: "10px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "15px",
                zIndex: 10000,
                minWidth: "250px"
            }}
        >
            {/* Spinner or Progress Bar */}
            {type === "indeterminate" ? (
                <div
                    style={{
                        width: "40px",
                        height: "40px",
                        border: "4px solid rgba(255, 255, 255, 0.3)",
                        borderTop: "4px solid #4fc3f7",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite"
                    }}
                />
            ) : (
                <div
                    style={{
                        width: "200px",
                        height: "8px",
                        background: "rgba(255, 255, 255, 0.3)",
                        borderRadius: "4px",
                        overflow: "hidden"
                    }}
                >
                    <div
                        style={{
                            width: `${Math.max(0, Math.min(100, progress || 0))}%`,
                            height: "100%",
                            background: "#4fc3f7",
                            transition: "width 0.3s ease",
                            borderRadius: "4px"
                        }}
                    />
                </div>
            )}

            {/* Message */}
            <div
                style={{
                    textAlign: "center",
                    fontSize: "16px",
                    fontWeight: "500"
                }}
            >
                {message}
            </div>

            {/* Progress percentage for determinate progress */}
            {type === "determinate" && (
                <div
                    style={{
                        fontSize: "14px",
                        opacity: 0.8
                    }}
                >
                    {Math.round(progress || 0)}%
                </div>
            )}

            <style>{`
                @keyframes spin {
                    0% {
                        transform: rotate(0deg);
                    }
                    100% {
                        transform: rotate(360deg);
                    }
                }
            `}</style>
        </div>
    )
}

export default ProgressIndicator
