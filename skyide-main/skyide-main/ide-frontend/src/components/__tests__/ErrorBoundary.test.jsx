// ide-frontend/src/components/__tests__/ErrorBoundary.test.jsx
import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import ErrorBoundary from "../ErrorBoundary.jsx"

// Component that throws an error for testing
const ThrowError = ({ shouldThrow = false }) => {
    if (shouldThrow) {
        throw new Error("Test error message")
    }
    return <div>Normal content</div>
}

// Component that throws an error in useEffect for testing lifecycle errors
const ThrowAsyncError = ({ shouldThrow = false }) => {
    React.useEffect(() => {
        if (shouldThrow) {
            throw new Error("Async test error")
        }
    }, [shouldThrow])

    return <div>Async content</div>
}

describe("ErrorBoundary", () => {
    let consoleSpy

    beforeEach(() => {
        // Mock console.error to prevent error logs in test output
        consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    })

    afterEach(() => {
        consoleSpy.mockRestore()
    })

    it("renders children when there is no error", () => {
        render(
            <ErrorBoundary>
                <div>Test content</div>
            </ErrorBoundary>
        )

        expect(screen.getByText("Test content")).toBeInTheDocument()
    })

    it("renders error UI when child component throws", () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        )

        expect(screen.getByText("🚨 Something went wrong")).toBeInTheDocument()
        expect(screen.getByText("Error Details (click to expand)")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument()
    })

    it("displays error details when expanded", () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        )

        const detailsElement = screen.getByText("Error Details (click to expand)")
        fireEvent.click(detailsElement)

        expect(screen.getByText(/Error: Test error message/)).toBeInTheDocument()
        expect(screen.getByText(/Component Stack:/)).toBeInTheDocument()
    })

    it('resets error state when "Try Again" is clicked', () => {
        // Create a component that can toggle throwing
        let shouldThrow = true
        const ToggleError = () => {
            if (shouldThrow) {
                throw new Error("Test error message")
            }
            return <div>Normal content</div>
        }

        const { rerender } = render(
            <ErrorBoundary>
                <ToggleError />
            </ErrorBoundary>
        )

        // Verify error boundary is showing
        expect(screen.getByText("🚨 Something went wrong")).toBeInTheDocument()

        // Click "Try Again" - this should reset the error boundary state
        const tryAgainButton = screen.getByRole("button", { name: "Try Again" })

        // Update the component to not throw before clicking Try Again
        shouldThrow = false

        fireEvent.click(tryAgainButton)

        // Re-render to trigger the component re-evaluation
        rerender(
            <ErrorBoundary>
                <ToggleError />
            </ErrorBoundary>
        )

        // Verify normal content is now shown
        expect(screen.getByText("Normal content")).toBeInTheDocument()
        expect(screen.queryByText("🚨 Something went wrong")).not.toBeInTheDocument()
    })

    it("logs error details to console", () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        )

        expect(consoleSpy).toHaveBeenCalledWith(
            "ErrorBoundary caught an error:",
            expect.any(Error),
            expect.objectContaining({
                componentStack: expect.any(String)
            })
        )
    })

    it("handles different error types", () => {
        const CustomError = ({ errorType }) => {
            if (errorType === "reference") {
                // eslint-disable-next-line no-undef
                return <div>{undefinedVariable}</div>
            }
            if (errorType === "type") {
                const obj = null
                return <div>{obj.property}</div>
            }
            return <div>No error</div>
        }

        render(
            <ErrorBoundary>
                <CustomError errorType="reference" />
            </ErrorBoundary>
        )

        expect(screen.getByText("🚨 Something went wrong")).toBeInTheDocument()
    })

    it("applies correct styling to error UI", () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        )

        const errorContainer = screen.getByText("🚨 Something went wrong").closest("div")

        expect(errorContainer).toHaveStyle({
            padding: "20px",
            margin: "10px",
            border: "2px solid #ff6b6b",
            "border-radius": "8px",
            "background-color": "#ffe0e0",
            color: "#d63031"
        })

        const tryAgainButton = screen.getByRole("button", { name: "Try Again" })
        expect(tryAgainButton).toHaveStyle({
            "background-color": "rgb(214, 48, 49)",
            color: "rgb(255, 255, 255)",
            "border-radius": "4px",
            cursor: "pointer"
        })
    })

    it("handles multiple child components with errors", () => {
        const MultipleChildren = () => (
            <ErrorBoundary>
                <div>First child</div>
                <ThrowError shouldThrow={true} />
                <div>Third child</div>
            </ErrorBoundary>
        )

        render(<MultipleChildren />)

        expect(screen.getByText("🚨 Something went wrong")).toBeInTheDocument()
        expect(screen.queryByText("First child")).not.toBeInTheDocument()
        expect(screen.queryByText("Third child")).not.toBeInTheDocument()
    })

    it("can be nested with other ErrorBoundaries", () => {
        render(
            <ErrorBoundary>
                <div>Outer content</div>
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
                <div>More outer content</div>
            </ErrorBoundary>
        )

        // Inner ErrorBoundary should catch the error
        expect(screen.getByText("🚨 Something went wrong")).toBeInTheDocument()
        // Outer content should still be visible
        expect(screen.getByText("Outer content")).toBeInTheDocument()
        expect(screen.getByText("More outer content")).toBeInTheDocument()
    })

    it("handles errors with empty or undefined messages", () => {
        const ThrowEmptyError = () => {
            throw new Error("")
        }

        render(
            <ErrorBoundary>
                <ThrowEmptyError />
            </ErrorBoundary>
        )

        expect(screen.getByText("🚨 Something went wrong")).toBeInTheDocument()
        // Should still show error UI even with empty error message
        const detailsElement = screen.getByText("Error Details (click to expand)")
        fireEvent.click(detailsElement)
        expect(screen.getByText(/Error:/)).toBeInTheDocument()
    })
})
