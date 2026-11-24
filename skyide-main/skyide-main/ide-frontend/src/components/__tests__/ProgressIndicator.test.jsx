// ide-frontend/src/components/__tests__/ProgressIndicator.test.jsx
import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import ProgressIndicator from "../ProgressIndicator.jsx"

describe("ProgressIndicator", () => {
    it("renders nothing when not visible", () => {
        const { container } = render(<ProgressIndicator isVisible={false} message="Loading..." />)

        expect(container.firstChild).toBeNull()
    })

    it("renders loading indicator when visible", () => {
        render(<ProgressIndicator isVisible={true} message="Loading..." />)

        expect(screen.getByText("Loading...")).toBeInTheDocument()
    })

    it("displays custom message", () => {
        const customMessage = "Converting Python to blocks..."
        render(<ProgressIndicator isVisible={true} message={customMessage} />)

        expect(screen.getByText(customMessage)).toBeInTheDocument()
    })

    it("shows default message when none provided", () => {
        render(<ProgressIndicator isVisible={true} />)

        expect(screen.getByText("Processing...")).toBeInTheDocument()
    })

    it("renders indeterminate spinner by default", () => {
        const { container } = render(<ProgressIndicator isVisible={true} message="Loading..." />)

        // Check for spinner element (div with spinner styling)
        const spinner = container.querySelector('div[style*="border-radius: 50%"]')
        expect(spinner).toBeInTheDocument()
        expect(spinner).toHaveStyle({
            width: "40px",
            height: "40px",
            "border-radius": "50%"
        })
    })

    it("renders progress bar when type is determinate", () => {
        const { container } = render(
            <ProgressIndicator
                isVisible={true}
                message="Uploading..."
                type="determinate"
                progress={50}
            />
        )

        // Check for progress bar container
        const progressContainer = container.querySelector('div[style*="width: 200px"]')
        expect(progressContainer).toBeInTheDocument()
        expect(progressContainer).toHaveStyle({
            width: "200px",
            height: "8px",
            "border-radius": "4px"
        })

        // Check for progress bar fill
        const progressFill = container.querySelector('div[style*="width: 50%"]')
        expect(progressFill).toBeInTheDocument()
        expect(progressFill).toHaveStyle({
            width: "50%",
            height: "100%"
        })
    })

    it("displays progress percentage for determinate type", () => {
        render(
            <ProgressIndicator
                isVisible={true}
                message="Processing..."
                type="determinate"
                progress={75}
            />
        )

        expect(screen.getByText("75%")).toBeInTheDocument()
    })

    it("handles zero progress correctly", () => {
        render(
            <ProgressIndicator
                isVisible={true}
                message="Starting..."
                type="determinate"
                progress={0}
            />
        )

        expect(screen.getByText("0%")).toBeInTheDocument()
    })

    it("handles 100% progress correctly", () => {
        const { container } = render(
            <ProgressIndicator
                isVisible={true}
                message="Complete!"
                type="determinate"
                progress={100}
            />
        )

        expect(screen.getByText("100%")).toBeInTheDocument()

        const progressFill = container.querySelector('div[style*="width: 100%"]')
        expect(progressFill).toBeInTheDocument()
    })

    it("rounds progress percentage to nearest integer", () => {
        render(
            <ProgressIndicator
                isVisible={true}
                message="Processing..."
                type="determinate"
                progress={33.7}
            />
        )

        expect(screen.getByText("34%")).toBeInTheDocument()
    })

    it("handles null progress gracefully", () => {
        const { container } = render(
            <ProgressIndicator
                isVisible={true}
                message="Processing..."
                type="determinate"
                progress={null}
            />
        )

        // Should default to 0% width
        const progressFill = container.querySelector('div[style*="width: 0%"]')
        expect(progressFill).toBeInTheDocument()
        expect(screen.getByText("0%")).toBeInTheDocument()
    })

    it("applies correct styling for overlay", () => {
        const { container } = render(<ProgressIndicator isVisible={true} message="Loading..." />)

        const overlay = container.firstChild
        expect(overlay).toHaveStyle({
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(0, 0, 0, 0.8)",
            color: "rgb(255, 255, 255)",
            "border-radius": "10px",
            "z-index": "10000"
        })
    })

    it("applies correct spinner animation styles", () => {
        const { container } = render(<ProgressIndicator isVisible={true} type="indeterminate" />)

        const spinner = container.querySelector('div[style*="border-radius: 50%"]')
        expect(spinner).toHaveStyle({
            border: "4px solid rgba(255, 255, 255, 0.3)",
            "border-top": "4px solid #4fc3f7",
            animation: "spin 1s linear infinite"
        })
    })

    it("applies correct progress bar transition styles", () => {
        const { container } = render(
            <ProgressIndicator isVisible={true} type="determinate" progress={60} />
        )

        const progressFill = container.querySelector('div[style*="width: 60%"]')
        expect(progressFill).toHaveStyle({
            background: "#4fc3f7",
            transition: "width 0.3s ease"
        })
    })

    it("handles very long messages without breaking layout", () => {
        const longMessage =
            "This is a very long message that might cause layout issues if not handled properly in the progress indicator component"

        render(<ProgressIndicator isVisible={true} message={longMessage} />)

        expect(screen.getByText(longMessage)).toBeInTheDocument()
    })

    it("handles negative progress values", () => {
        const { container } = render(
            <ProgressIndicator isVisible={true} type="determinate" progress={-10} />
        )

        // Should clamp width to 0% but display the actual value
        const progressFill = container.querySelector('div[style*="width: 0%"]')
        expect(progressFill).toBeInTheDocument()
        expect(screen.getByText("-10%")).toBeInTheDocument()
    })

    it("handles progress values over 100%", () => {
        const { container } = render(
            <ProgressIndicator isVisible={true} type="determinate" progress={150} />
        )

        // Should clamp width to 100% but display the actual value
        const progressFill = container.querySelector('div[style*="width: 100%"]')
        expect(progressFill).toBeInTheDocument()
        expect(screen.getByText("150%")).toBeInTheDocument()
    })

    it("switches between indeterminate and determinate types", () => {
        const { rerender, container } = render(
            <ProgressIndicator isVisible={true} type="indeterminate" />
        )

        // Check spinner is present
        expect(container.querySelector('div[style*="border-radius: 50%"]')).toBeInTheDocument()

        // Switch to determinate
        rerender(<ProgressIndicator isVisible={true} type="determinate" progress={50} />)

        // Check progress bar is present
        expect(container.querySelector('div[style*="width: 200px"]')).toBeInTheDocument()
        expect(screen.getByText("50%")).toBeInTheDocument()
    })
})
