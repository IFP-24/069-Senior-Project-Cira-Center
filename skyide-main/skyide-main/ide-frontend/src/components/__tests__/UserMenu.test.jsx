// ide-frontend/src/components/__tests__/UserMenu.test.jsx
import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { MemoryRouter } from "react-router-dom"
import UserMenu from "../UserMenu.jsx"

// Mock the AuthContext
const mockLogout = vi.fn()
const mockUseAuth = vi.fn()

vi.mock("../../context/AuthContext.jsx", () => ({
    useAuth: () => mockUseAuth()
}))

// Helper to render with Router
const renderWithRouter = ui => {
    return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe("UserMenu", () => {
    const user = userEvent.setup()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("renders nothing when user is not logged in", () => {
        mockUseAuth.mockReturnValue({
            user: null,
            logout: mockLogout
        })

        const { container } = renderWithRouter(<UserMenu />)
        expect(container.firstChild).toBeNull()
    })

    it("renders user button when user is logged in", () => {
        mockUseAuth.mockReturnValue({
            user: { username: "testuser", email: "test@example.com" },
            logout: mockLogout
        })

        renderWithRouter(<UserMenu />)

        expect(screen.getByRole("button", { name: /testuser/ })).toBeInTheDocument()
    })

    it("shows dropdown when user button is clicked", async () => {
        mockUseAuth.mockReturnValue({
            user: { username: "testuser", email: "test@example.com" },
            logout: mockLogout
        })

        renderWithRouter(<UserMenu />)

        const userButton = screen.getByRole("button", { name: /testuser/ })
        await user.click(userButton)

        expect(screen.getByRole("button", { name: "Profile" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Logout" })).toBeInTheDocument()
    })

    it("toggles dropdown visibility on multiple clicks", async () => {
        mockUseAuth.mockReturnValue({
            user: { username: "testuser", email: "test@example.com" },
            logout: mockLogout
        })

        renderWithRouter(<UserMenu />)

        const userButton = screen.getByRole("button", { name: /testuser/ })

        // Open dropdown
        await user.click(userButton)
        expect(screen.getByRole("button", { name: "Profile" })).toBeInTheDocument()

        // Close dropdown
        await user.click(userButton)
        expect(screen.queryByRole("button", { name: "Profile" })).not.toBeInTheDocument()

        // Open again
        await user.click(userButton)
        expect(screen.getByRole("button", { name: "Profile" })).toBeInTheDocument()
    })

    it("closes dropdown when clicking outside", async () => {
        mockUseAuth.mockReturnValue({
            user: { username: "testuser", email: "test@example.com" },
            logout: mockLogout
        })

        render(
            <MemoryRouter>
                <div>
                    <UserMenu />
                    <div data-testid="outside">Outside element</div>
                </div>
            </MemoryRouter>
        )

        const userButton = screen.getByRole("button", { name: /testuser/ })
        const outsideElement = screen.getByTestId("outside")

        // Open dropdown
        await user.click(userButton)
        expect(screen.getByRole("button", { name: "Profile" })).toBeInTheDocument()

        // Click outside
        fireEvent.mouseDown(outsideElement)

        await waitFor(() => {
            expect(screen.queryByRole("button", { name: "Profile" })).not.toBeInTheDocument()
        })
    })

    it("calls logout function when logout is clicked", async () => {
        mockUseAuth.mockReturnValue({
            user: { username: "testuser", email: "test@example.com" },
            logout: mockLogout
        })

        renderWithRouter(<UserMenu />)

        const userButton = screen.getByRole("button", { name: /testuser/ })
        await user.click(userButton)

        const logoutButton = screen.getByRole("button", { name: "Logout" })
        await user.click(logoutButton)

        expect(mockLogout).toHaveBeenCalled()
    })

    it("closes dropdown after logout is clicked", async () => {
        mockUseAuth.mockReturnValue({
            user: { username: "testuser", email: "test@example.com" },
            logout: mockLogout
        })

        renderWithRouter(<UserMenu />)

        const userButton = screen.getByRole("button", { name: /testuser/ })
        await user.click(userButton)

        const logoutButton = screen.getByRole("button", { name: "Logout" })
        await user.click(logoutButton)

        // Dropdown should be closed
        expect(screen.queryByRole("button", { name: "Profile" })).not.toBeInTheDocument()
    })

    it("closes dropdown when Profile is clicked", async () => {
        mockUseAuth.mockReturnValue({
            user: { username: "testuser", email: "test@example.com" },
            logout: mockLogout
        })

        renderWithRouter(<UserMenu />)

        const userButton = screen.getByRole("button", { name: /testuser/ })
        await user.click(userButton)

        const profileButton = screen.getByRole("button", { name: "Profile" })
        await user.click(profileButton)

        // Dropdown should be closed
        expect(screen.queryByRole("button", { name: "Profile" })).not.toBeInTheDocument()
    })

    it("displays different usernames correctly", () => {
        const testCases = [
            "john_doe",
            "admin",
            "user@example.com",
            "test user with spaces",
            "वैदिक", // Unicode username
            "用户123" // Chinese characters
        ]

        testCases.forEach(username => {
            mockUseAuth.mockReturnValue({
                user: { username },
                logout: mockLogout
            })

            const { rerender } = render(
                <MemoryRouter>
                    <UserMenu />
                </MemoryRouter>
            )
            expect(
                screen.getByRole("button", { name: new RegExp(`${username}`) })
            ).toBeInTheDocument()
            rerender(<div />) // Clean up for next iteration
        })
    })

    it("applies correct CSS classes", () => {
        mockUseAuth.mockReturnValue({
            user: { username: "testuser", email: "test@example.com" },
            logout: mockLogout
        })

        const { container } = renderWithRouter(<UserMenu />)

        expect(container.querySelector(".user-menu")).toBeInTheDocument()
        expect(container.querySelector(".user-button")).toBeInTheDocument()
    })

    it("shows dropdown with correct CSS class when open", async () => {
        mockUseAuth.mockReturnValue({
            user: { username: "testuser", email: "test@example.com" },
            logout: mockLogout
        })

        const { container } = renderWithRouter(<UserMenu />)

        const userButton = screen.getByRole("button", { name: /testuser/ })
        await user.click(userButton)

        expect(container.querySelector(".user-dropdown")).toBeInTheDocument()
    })

    it("handles user object with additional properties", () => {
        mockUseAuth.mockReturnValue({
            user: {
                username: "testuser",
                email: "test@example.com",
                id: 123,
                role: "admin",
                avatar: "avatar.jpg"
            },
            logout: mockLogout
        })

        renderWithRouter(<UserMenu />)

        // Should still render the username correctly
        expect(screen.getByRole("button", { name: /testuser/ })).toBeInTheDocument()
    })

    it("handles missing username gracefully", () => {
        mockUseAuth.mockReturnValue({
            user: { email: "test@example.com" }, // No username
            logout: mockLogout
        })

        const { container } = renderWithRouter(<UserMenu />)

        // Should render with undefined username
        expect(container.querySelector(".user-button")).toBeInTheDocument()
    })

    it("prevents dropdown from staying open on rapid clicks", async () => {
        mockUseAuth.mockReturnValue({
            user: { username: "testuser", email: "test@example.com" },
            logout: mockLogout
        })

        renderWithRouter(<UserMenu />)

        const userButton = screen.getByRole("button", { name: /testuser/ })

        // Test that rapid clicks work predictably - each click should toggle the state
        await user.click(userButton) // Open
        await waitFor(() =>
            expect(screen.queryByRole("button", { name: "Profile" })).toBeInTheDocument()
        )

        await user.click(userButton) // Close
        await waitFor(() =>
            expect(screen.queryByRole("button", { name: "Profile" })).not.toBeInTheDocument()
        )

        await user.click(userButton) // Open again
        await waitFor(() =>
            expect(screen.queryByRole("button", { name: "Profile" })).toBeInTheDocument()
        )

        // Final state should be open after 3 clicks
        expect(screen.queryByRole("button", { name: "Profile" })).toBeInTheDocument()
    })

    it("maintains proper accessibility", async () => {
        mockUseAuth.mockReturnValue({
            user: { username: "testuser", email: "test@example.com" },
            logout: mockLogout
        })

        renderWithRouter(<UserMenu />)

        const userButton = screen.getByRole("button", { name: /testuser/ })
        expect(userButton).toBeInTheDocument()

        await user.click(userButton)

        // All dropdown items should be buttons
        expect(screen.getByRole("button", { name: "Profile" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Logout" })).toBeInTheDocument()
    })

    it("handles keyboard navigation", async () => {
        mockUseAuth.mockReturnValue({
            user: { username: "testuser", email: "test@example.com" },
            logout: mockLogout
        })

        renderWithRouter(<UserMenu />)

        const userButton = screen.getByRole("button", { name: /testuser/ })

        // Focus and open with Enter key
        userButton.focus()
        await user.keyboard("{Enter}")

        expect(screen.getByRole("button", { name: "Profile" })).toBeInTheDocument()

        // Navigate through dropdown with Tab
        await user.tab()
        expect(screen.getByRole("button", { name: "Profile" })).toHaveFocus()

        await user.tab()
        expect(screen.getByRole("button", { name: "Logout" })).toHaveFocus()
    })
})
