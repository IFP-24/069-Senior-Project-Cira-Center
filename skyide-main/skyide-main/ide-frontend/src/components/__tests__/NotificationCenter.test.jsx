// Tests for NotificationCenter component
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import NotificationCenter from "@components/NotificationCenter"
import { renderWithProviders, mockNotification } from "../../test/utils"

describe("NotificationCenter", () => {
    const mockOnRemove = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("renders nothing when no notifications", () => {
        const { container } = renderWithProviders(
            <NotificationCenter notifications={[]} onRemove={mockOnRemove} />
        )

        expect(container.firstChild).toBeNull()
    })

    it("renders notification with correct styling for success type", () => {
        const notification = { ...mockNotification, type: "success" }
        renderWithProviders(
            <NotificationCenter notifications={[notification]} onRemove={mockOnRemove} />
        )

        const notificationElement = screen.getByText("Test notification")
        expect(notificationElement).toBeInTheDocument()
        expect(screen.getByText("✅")).toBeInTheDocument()
    })

    it("renders notification with correct styling for error type", () => {
        const notification = { ...mockNotification, type: "error" }
        renderWithProviders(
            <NotificationCenter notifications={[notification]} onRemove={mockOnRemove} />
        )

        expect(screen.getByText("❌")).toBeInTheDocument()
    })

    it("renders notification with title and message", () => {
        const notification = {
            ...mockNotification,
            title: "Success",
            message: "Operation completed"
        }
        renderWithProviders(
            <NotificationCenter notifications={[notification]} onRemove={mockOnRemove} />
        )

        expect(screen.getByText("Success")).toBeInTheDocument()
        expect(screen.getByText("Operation completed")).toBeInTheDocument()
    })

    it("calls onRemove when notification is clicked", async () => {
        const user = userEvent.setup()
        renderWithProviders(
            <NotificationCenter notifications={[mockNotification]} onRemove={mockOnRemove} />
        )

        await user.click(screen.getByText("Test notification"))

        expect(mockOnRemove).toHaveBeenCalledWith(mockNotification.id)
    })

    it("calls onRemove when close button is clicked", async () => {
        const user = userEvent.setup()
        renderWithProviders(
            <NotificationCenter notifications={[mockNotification]} onRemove={mockOnRemove} />
        )

        await user.click(screen.getByRole("button", { name: /×/i }))

        expect(mockOnRemove).toHaveBeenCalledWith(mockNotification.id)
    })

    it("renders multiple notifications", () => {
        const notifications = [
            { ...mockNotification, id: "1", message: "First notification" },
            { ...mockNotification, id: "2", message: "Second notification" }
        ]
        renderWithProviders(
            <NotificationCenter notifications={notifications} onRemove={mockOnRemove} />
        )

        expect(screen.getByText("First notification")).toBeInTheDocument()
        expect(screen.getByText("Second notification")).toBeInTheDocument()
    })

    it("handles malformed notification objects gracefully", () => {
        const notifications = [null, undefined, "invalid", {}]

        expect(() => {
            renderWithProviders(
                <NotificationCenter notifications={notifications} onRemove={mockOnRemove} />
            )
        }).not.toThrow()
    })
})
