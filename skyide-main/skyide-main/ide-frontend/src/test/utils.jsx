// Test utilities for common testing patterns
import React from "react"
import { render } from "@testing-library/react"
import { BrowserRouter } from "react-router-dom"
import { AuthProvider } from "@context/AuthContext"

// Custom render function that includes providers
export function renderWithProviders(ui, options = {}) {
    const { initialEntries = ["/"], ...renderOptions } = options

    function Wrapper({ children }) {
        return (
            <BrowserRouter>
                <AuthProvider>{children}</AuthProvider>
            </BrowserRouter>
        )
    }

    return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Mock user for authenticated tests
export const mockUser = {
    id: 1,
    username: "testuser",
    email: "test@example.com"
}

// Mock authenticated context
export function renderWithAuth(ui, user = mockUser) {
    const MockAuthProvider = ({ children }) => (
        <AuthProvider
            value={{
                user,
                login: vi.fn(),
                logout: vi.fn(),
                register: vi.fn(),
                loading: false
            }}
        >
            {children}
        </AuthProvider>
    )

    return render(
        <BrowserRouter>
            <MockAuthProvider>{ui}</MockAuthProvider>
        </BrowserRouter>
    )
}

// Wait for loading states to complete
export const waitForLoadingToFinish = () => new Promise(resolve => setTimeout(resolve, 0))

// Mock workspace with blocks for testing
export const mockWorkspace = {
    addChangeListener: vi.fn(),
    dispose: vi.fn(),
    clear: vi.fn(),
    getAllBlocks: vi.fn(() => [
        { type: "variables_set", id: "block1" },
        { type: "text_print", id: "block2" }
    ])
}

// Mock Blockly serialization data
export const mockBlocklyData = {
    blocks: {
        languageVersion: 0,
        blocks: [
            {
                type: "variables_set",
                id: "test-block-1",
                x: 100,
                y: 100,
                fields: { VAR: "testVar" },
                inputs: {
                    VALUE: {
                        shadow: {
                            type: "math_number",
                            fields: { NUM: 42 }
                        }
                    }
                }
            }
        ]
    }
}

// Utility to simulate user interactions
export const createMockEvent = (type, props = {}) => ({
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    target: { value: "", ...props },
    type,
    ...props
})

// Mock notification for testing
export const mockNotification = {
    id: "123",
    type: "success",
    message: "Test notification",
    timestamp: Date.now()
}
