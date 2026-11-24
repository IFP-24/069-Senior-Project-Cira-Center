// Test setup file
import "@testing-library/jest-dom"
import { beforeAll, afterEach, afterAll } from "vitest"
import { cleanup } from "@testing-library/react"
import { server } from "./mocks/server"

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))

// Reset handlers after each test `important for test isolation`
afterEach(() => {
    server.resetHandlers()
    cleanup()
})

// Clean up after the tests are finished
afterAll(() => server.close())

// Mock Blockly since it's not available in test environment
const mockBlockly = {
    inject: vi.fn(() => ({
        addChangeListener: vi.fn(),
        dispose: vi.fn(),
        clear: vi.fn(),
        getAllBlocks: vi.fn(() => [])
    })),
    serialization: {
        workspaces: {
            save: vi.fn(() => ({})),
            load: vi.fn()
        }
    },
    Blocks: {}
}

vi.mock("blockly/core", () => mockBlockly)
vi.mock("blockly/blocks", () => ({}))
vi.mock("blockly/javascript", () => ({
    javascriptGenerator: {
        workspaceToCode: vi.fn(() => "// Generated code")
    }
}))
vi.mock("blockly/python", () => ({
    pythonGenerator: {
        forBlock: {},
        quote_: vi.fn(value => `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`),
        ORDER_NONE: 0,
        ORDER_FUNCTION_CALL: 0,
        ORDER_ATOMIC: 0,
        INDENT: "    ",
        statementToCode: vi.fn(() => ""),
        valueToCode: vi.fn(() => "0"),
        workspaceToCode: vi.fn(() => "# Generated Python code")
    }
}))

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
}
global.localStorage = localStorageMock

// Mock clipboard API
Object.assign(navigator, {
    clipboard: {
        writeText: vi.fn(() => Promise.resolve())
    }
})

// Suppress console warnings during tests unless explicitly needed
global.console = {
    ...console,
    warn: vi.fn(),
    error: vi.fn()
}
