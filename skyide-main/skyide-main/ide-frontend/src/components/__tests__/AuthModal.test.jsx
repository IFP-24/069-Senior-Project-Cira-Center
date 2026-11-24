// Tests for AuthModal component
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import AuthModal from "@components/AuthModal"
import { renderWithProviders } from "../../test/utils"

describe("AuthModal", () => {
    const mockOnClose = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("does not render when isOpen is false", () => {
        renderWithProviders(<AuthModal isOpen={false} onClose={mockOnClose} />)

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("renders login form by default when open", () => {
        renderWithProviders(<AuthModal isOpen={true} onClose={mockOnClose} />)

        expect(screen.getByRole("heading", { name: /login/i })).toBeInTheDocument()
        expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
        expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: /sign up/i })).toHaveClass("link-button-signup")
    })

    it("can switch to register form", async () => {
        const user = userEvent.setup()
        renderWithProviders(<AuthModal isOpen={true} onClose={mockOnClose} />)

        await user.click(screen.getByRole("button", { name: /sign up/i }))

        expect(screen.getByRole("heading", { name: /create account/i })).toBeInTheDocument()
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    })

    it("closes when close button is clicked", async () => {
        const user = userEvent.setup()
        renderWithProviders(<AuthModal isOpen={true} onClose={mockOnClose} />)

        await user.click(screen.getByRole("button", { name: /x/i }))

        expect(mockOnClose).toHaveBeenCalledOnce()
    })

    it("closes when clicking outside modal", async () => {
        const user = userEvent.setup()
        renderWithProviders(<AuthModal isOpen={true} onClose={mockOnClose} />)

        // Click on the overlay
        await user.click(
            screen.getByTestId("modal-overlay") || screen.getByRole("dialog").parentElement
        )

        expect(mockOnClose).toHaveBeenCalledOnce()
    })

    it("submits login form with valid data", async () => {
        const user = userEvent.setup()
        renderWithProviders(<AuthModal isOpen={true} onClose={mockOnClose} />)

        await user.type(screen.getByLabelText(/username/i), "testuser")
        await user.type(screen.getByLabelText(/password/i), "password")
        await user.click(screen.getByRole("button", { name: /login/i }))

        await waitFor(() => {
            expect(mockOnClose).toHaveBeenCalledOnce()
        })
    })

    it("shows error message for invalid login", async () => {
        const user = userEvent.setup()
        renderWithProviders(<AuthModal isOpen={true} onClose={mockOnClose} />)

        await user.type(screen.getByLabelText(/username/i), "invaliduser")
        await user.type(screen.getByLabelText(/password/i), "wrongpassword")
        await user.click(screen.getByRole("button", { name: /login/i }))

        await waitFor(() => {
            expect(screen.getByText("Invalid username or password")).toBeInTheDocument()
        })
    })
})
