// ide-frontend/src/components/ErrorBoundary.jsx
import React from "react"

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null, errorInfo: null }
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        console.log("getDerivedStateFromError", error)
        return { hasError: true }
    }

    componentDidCatch(error, errorInfo) {
        // Log the error details
        console.error("ErrorBoundary caught an error:", error, errorInfo)
        this.setState({
            error: error,
            errorInfo: errorInfo
        })
    }

    render() {
        if (this.state.hasError) {
            // Custom error UI
            return (
                <div
                    style={{
                        padding: "20px",
                        margin: "10px",
                        border: "2px solid #ff6b6b",
                        borderRadius: "8px",
                        backgroundColor: "#ffe0e0",
                        color: "#d63031"
                    }}
                >
                    <h3>🚨 Something went wrong</h3>
                    <details style={{ whiteSpace: "pre-wrap", marginTop: "10px" }}>
                        <summary>Error Details (click to expand)</summary>
                        <div
                            style={{
                                marginTop: "10px",
                                padding: "10px",
                                backgroundColor: "#fff",
                                borderRadius: "4px",
                                fontSize: "12px",
                                fontFamily: "monospace"
                            }}
                        >
                            <strong>Error:</strong>{" "}
                            {this.state.error && this.state.error.toString()}
                            <br />
                            <strong>Component Stack:</strong>{" "}
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </div>
                    </details>
                    <button
                        onClick={() =>
                            this.setState({ hasError: false, error: null, errorInfo: null })
                        }
                        style={{
                            marginTop: "10px",
                            padding: "8px 16px",
                            backgroundColor: "#d63031",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer"
                        }}
                    >
                        Try Again
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
