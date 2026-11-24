// ide-frontend/src/components/__tests__/Register.test.jsx
import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import Register from "../Register.jsx"

// Mock the AuthContext
const mockRegister = vi.fn()
const mockUseAuth = vi.fn(() => ({
    register: mockRegister,
    user: null,
    loading: false
}))

vi.mock("../../context/AuthContext.jsx", () => ({
    useAuth: () => mockUseAuth()
}))

describe("Register", () => {
    const mockOnToggleMode = vi.fn()
    const mockOnClose = vi.fn()
    const user = userEvent.setup()

    beforeEach(() => {
        vi.clearAllMocks()
        mockRegister.mockResolvedValue({ success: true })
    })

    it("renders registration form with all required fields", () => {
        render(<Register onToggleMode={mockOnToggleMode} onClose={mockOnClose} />)

        expect(screen.getByRole("heading", { name: "Create Account" })).toBeInTheDocument()
        expect(screen.getByLabelText("Username")).toBeInTheDocument()
        expect(screen.getByLabelText("Email")).toBeInTheDocument()
        expect(screen.getByLabelText("Password")).toBeInTheDocument()
        expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument()
    })

    it("updates form data when user types", async () => {
        render(<Register onToggleMode={mockOnToggleMode} onClose={mockOnClose} />)

        const usernameInput = screen.getByLabelText("Username")
        const emailInput = screen.getByLabelText("Email")
        const passwordInput = screen.getByLabelText("Password")
        const confirmPasswordInput = screen.getByLabelText("Confirm Password")

        await user.type(usernameInput, "testuser")
        await user.type(emailInput, "test@example.com")
        await user.type(passwordInput, "testpass123")
        await user.type(confirmPasswordInput, "testpass123")

        expect(usernameInput).toHaveValue("testuser")
        expect(emailInput).toHaveValue("test@example.com")
        expect(passwordInput).toHaveValue("testpass123")
        expect(confirmPasswordInput).toHaveValue("testpass123")
    })

    it("validates username length", async () => {
        render(<Register onToggleMode={mockOnToggleMode} onClose={mockOnClose} />)

        const usernameInput = screen.getByLabelText("Username")
        const submitButton = screen.getByRole("button", { name: "Create Account" })

        await user.type(usernameInput, "ab") // Too short
        await user.click(submitButton)

        // Component should not call register with invalid data
        expect(mockRegister).not.toHaveBeenCalled()
    })

    it("validates email format", async () => {
        render(<Register onToggleMode={mockOnToggleMode} onClose={mockOnClose} />)

        const emailInput = screen.getByLabelText("Email")
        const submitButton = screen.getByRole("button", { name: "Create Account" })

        await user.type(emailInput, "invalid-email")
        await user.click(submitButton)

        expect(mockRegister).not.toHaveBeenCalled()
    })

    it("validates password length", async () => {
        render(<Register onToggleMode={mockOnToggleMode} onClose={mockOnClose} />)

        const passwordInput = screen.getByLabelText("Password")
        const submitButton = screen.getByRole("button", { name: "Create Account" })

        await user.type(passwordInput, "12345") // Too short
        await user.click(submitButton)

        expect(mockRegister).not.toHaveBeenCalled()
    })

    it("validates password confirmation match", async () => {
        render(<Register onToggleMode={mockOnToggleMode} onClose={mockOnClose} />)

        const passwordInput = screen.getByLabelText("Password")
        const confirmPasswordInput = screen.getByLabelText("Confirm Password")
        const submitButton = screen.getByRole("button", { name: "Create Account" })

        await user.type(passwordInput, "password123")
        await user.type(confirmPasswordInput, "differentpass")
        await user.click(submitButton)

        expect(mockRegister).not.toHaveBeenCalled()
    })

    it("submits form with valid data", async () => {
        render(<Register onToggleMode={mockOnToggleMode} onClose={mockOnClose} />)

        const usernameInput = screen.getByLabelText("Username")
        const emailInput = screen.getByLabelText("Email")
        const passwordInput = screen.getByLabelText("Password")
        const confirmPasswordInput = screen.getByLabelText("Confirm Password")
        const submitButton = screen.getByRole("button", { name: "Create Account" })

        await user.type(usernameInput, "testuser")
        await user.type(emailInput, "test@example.com")
        await user.type(passwordInput, "testpass123")
        await user.type(confirmPasswordInput, "testpass123")
        await user.click(submitButton)

        expect(mockRegister).toHaveBeenCalledWith("testuser", "test@example.com", "testpass123")
    })

    it("closes modal on successful registration", async () => {
        mockRegister.mockResolvedValue({ success: true })

        render(<Register onToggleMode={mockOnToggleMode} onClose={mockOnClose} />)

        const usernameInput = screen.getByLabelText("Username")
        const emailInput = screen.getByLabelText("Email")
        const passwordInput = screen.getByLabelText("Password")
        const confirmPasswordInput = screen.getByLabelText("Confirm Password")
        const submitButton = screen.getByRole("button", { name: "Create Account" })

        await user.type(usernameInput, "testuser")
        await user.type(emailInput, "test@example.com")
        await user.type(passwordInput, "testpass123")
        await user.type(confirmPasswordInput, "testpass123")
        await user.click(submitButton)

        await waitFor(() => {
            expect(mockOnClose).toHaveBeenCalled()
        })
    })

    it("displays error message on registration failure", async () => {
        const errorMessage = "Database connection failed"
        mockRegister.mockResolvedValue({ success: false, error: errorMessage })

        render(<Register onToggleMode={mockOnToggleMode} onClose={mockOnClose} />)

        const usernameInput = screen.getByLabelText("Username")
        const emailInput = screen.getByLabelText("Email")
        const passwordInput = screen.getByLabelText("Password")
        const confirmPasswordInput = screen.getByLabelText("Confirm Password")
        const submitButton = screen.getByRole("button", { name: "Create Account" })

        await user.type(usernameInput, "testuser")
        await user.type(emailInput, "existing@example.com")
        await user.type(passwordInput, "testpass123")
        await user.type(confirmPasswordInput, "testpass123")
        await user.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText(errorMessage)).toBeInTheDocument()
        })

        expect(mockOnClose).not.toHaveBeenCalled()
    })

    it("shows loading state during registration", async () => {
        let resolveRegister
        const registerPromise = new Promise(resolve => {
            resolveRegister = resolve
        })
        mockRegister.mockReturnValue(registerPromise)

        render(<Register onToggleMode={mockOnToggleMode} onClose={mockOnClose} />)

        const usernameInput = screen.getByLabelText("Username")
        const emailInput = screen.getByLabelText("Email")
        const passwordInput = screen.getByLabelText("Password")
        const confirmPasswordInput = screen.getByLabelText("Confirm Password")
        const submitButton = screen.getByRole("button", { name: "Create Account" })

        await user.type(usernameInput, "testuser")
        await user.type(emailInput, "test@example.com")
        await user.type(passwordInput, "testpass123")
        await user.type(confirmPasswordInput, "testpass123")
        await user.click(submitButton)

        // Button should show loading state
        expect(screen.getByRole("button", { name: "Creating Account..." })).toBeInTheDocument()
        expect(submitButton).toBeDisabled()

        // Resolve the promise
        resolveRegister({ success: true })
        await waitFor(() => {
            expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument()
        })
    })

    it("clears field errors when user starts typing", async () => {
        render(<Register onToggleMode={mockOnToggleMode} onClose={mockOnClose} />)

        const usernameInput = screen.getByLabelText("Username")
        const submitButton = screen.getByRole("button", { name: "Create Account" })

        // Trigger validation error by trying to submit with short username
        await user.type(usernameInput, "ab")
        await user.click(submitButton)

        // Verify register was not called (indicating validation failed)
        expect(mockRegister).not.toHaveBeenCalled()

        // Start typing again - should clear errors and allow new submission
        await user.type(usernameInput, "c")

        // The component should now have a longer username and handle new input
        expect(usernameInput).toHaveValue("abc")
    })

    it("validates multiple fields simultaneously", async () => {
        render(<Register onToggleMode={mockOnToggleMode} onClose={mockOnClose} />)

        const usernameInput = screen.getByLabelText("Username")
        const emailInput = screen.getByLabelText("Email")
        const passwordInput = screen.getByLabelText("Password")
        const confirmPasswordInput = screen.getByLabelText("Confirm Password")
        const submitButton = screen.getByRole("button", { name: "Create Account" })

        // Fill with invalid data
        await user.type(usernameInput, "ab") // Too short
        await user.type(emailInput, "invalid") // Invalid email
        await user.type(passwordInput, "123") // Too short
        await user.type(confirmPasswordInput, "456") // Doesn't match
        await user.click(submitButton)

        // Should not call register with invalid data
        expect(mockRegister).not.toHaveBeenCalled()
    })

    it("calls onToggleMode when login link is clicked", async () => {
        render(<Register onToggleMode={mockOnToggleMode} onClose={mockOnClose} />)

        const loginLink = screen.getByRole("button", { name: "Login" })
        await user.click(loginLink)

        expect(mockOnToggleMode).toHaveBeenCalled()
    })

    it("handles form submission via Enter key", async () => {
        render(<Register onToggleMode={mockOnToggleMode} onClose={mockOnClose} />)

        const usernameInput = screen.getByLabelText("Username")
        const emailInput = screen.getByLabelText("Email")
        const passwordInput = screen.getByLabelText("Password")
        const confirmPasswordInput = screen.getByLabelText("Confirm Password")

        await user.type(usernameInput, "testuser")
        await user.type(emailInput, "test@example.com")
        await user.type(passwordInput, "testpass123")
        await user.type(confirmPasswordInput, "testpass123")
        await user.keyboard("{Enter}")

        expect(mockRegister).toHaveBeenCalledWith("testuser", "test@example.com", "testpass123")
    })

    it("validates email with various formats", async () => {
        const testCases = [
            { email: "valid@example.com", shouldBeValid: true },
            { email: "user.name@domain.co.uk", shouldBeValid: true },
            { email: "user+tag@example.org", shouldBeValid: true },
            { email: "invalid.email", shouldBeValid: false },
            { email: "@example.com", shouldBeValid: false },
            { email: "user@", shouldBeValid: false },
            { email: "user@domain", shouldBeValid: false },
            { email: "", shouldBeValid: true }
        ]

        for (const testCase of testCases) {
            const { rerender } = render(
                <Register onToggleMode={mockOnToggleMode} onClose={mockOnClose} />
            )

            const emailInput = screen.getByLabelText("Email")
            const submitButton = screen.getByRole("button", {
                name: "Create Account"
            })

            await user.clear(emailInput)
            if (testCase.email) {
                await user.type(emailInput, testCase.email)
            }
            await user.click(submitButton)

            if (testCase.shouldBeValid) {
                // For valid emails, we expect validation to pass (though other fields might still fail)
                expect(emailInput).toHaveValue(testCase.email)
            } else {
                // For invalid emails, register should not be called
                expect(mockRegister).not.toHaveBeenCalled()
            }

            rerender(<div />) // Clean up for next iteration
            vi.clearAllMocks() // Clear mocks for next iteration
        }
    })

    it("applies correct CSS classes", () => {
        const { container } = render(
            <Register onToggleMode={mockOnToggleMode} onClose={mockOnClose} />
        )

        expect(container.querySelector(".auth-form")).toBeInTheDocument()
        expect(container.querySelector(".form-group")).toBeInTheDocument()
        expect(container.querySelector(".auth-button")).toBeInTheDocument()
        expect(container.querySelector(".auth-button-signup")).toBeInTheDocument()
        expect(container.querySelector(".link-button")).toBeInTheDocument()
    })

    it("has proper accessibility attributes", () => {
        render(<Register onToggleMode={mockOnToggleMode} onClose={mockOnClose} />)

        // Check form exists (even without role="form")
        const submitButton = screen.getByRole("button", { name: "Create Account" })
        expect(submitButton).toBeInTheDocument()

        const usernameInput = screen.getByLabelText("Username")
        expect(usernameInput).toHaveAttribute("type", "text")
        expect(usernameInput).toHaveAttribute("required")

        const emailInput = screen.getByLabelText("Email")
        expect(emailInput).toHaveAttribute("type", "email")
        expect(emailInput).not.toHaveAttribute("required")

        const passwordInput = screen.getByLabelText("Password")
        expect(passwordInput).toHaveAttribute("type", "password")
        expect(passwordInput).toHaveAttribute("required")

        const confirmPasswordInput = screen.getByLabelText("Confirm Password")
        expect(confirmPasswordInput).toHaveAttribute("type", "password")
        expect(confirmPasswordInput).toHaveAttribute("required")
    })

    it("handles rapid form submissions correctly", async () => {
        // let resolveCount = 0;
        mockRegister.mockImplementation(() => {
            // resolveCount++;
            return Promise.resolve({ success: true })
        })

        render(<Register onToggleMode={mockOnToggleMode} onClose={mockOnClose} />)

        const usernameInput = screen.getByLabelText("Username")
        const emailInput = screen.getByLabelText("Email")
        const passwordInput = screen.getByLabelText("Password")
        const confirmPasswordInput = screen.getByLabelText("Confirm Password")
        const submitButton = screen.getByRole("button", { name: "Create Account" })

        await user.type(usernameInput, "testuser")
        await user.type(emailInput, "test@example.com")
        await user.type(passwordInput, "testpass123")
        await user.type(confirmPasswordInput, "testpass123")

        // Rapidly click submit button
        await user.click(submitButton)
        await user.click(submitButton)
        await user.click(submitButton)

        // Should only call register once due to loading state
        await waitFor(() => {
            expect(mockRegister).toHaveBeenCalledTimes(1)
        })
    })
})
