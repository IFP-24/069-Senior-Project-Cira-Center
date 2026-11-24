// ide-frontend/src/hooks/__tests__/usePythonToBlocks.test.js
import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { usePythonToBlocks } from "../usePythonToBlocks.js"

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
}

Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true
})

describe("usePythonToBlocks", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        localStorageMock.getItem.mockReturnValue(null)
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    it("initializes with default state", () => {
        const { result } = renderHook(() => usePythonToBlocks())

        expect(result.current.pythonCode).toBe("")
        expect(result.current.blocksJson).toBeNull()
        expect(result.current.isConverting).toBe(false)
        expect(result.current.conversionError).toBeNull()
        expect(result.current.conversionHistory).toEqual([])
    })

    it("does not auto-load by default", () => {
        renderHook(() => usePythonToBlocks())

        expect(localStorageMock.getItem).toHaveBeenCalledWith("skyide_conversion_history")
        expect(localStorageMock.getItem).not.toHaveBeenCalledWith("skyide_python_code")
        expect(localStorageMock.getItem).not.toHaveBeenCalledWith("skyide_blocks_json")
    })

    it("loads saved data when autoLoad is true", () => {
        const savedPython = 'print("hello")'
        const savedBlocks = '{"blocks": []}'
        const savedHistory = '[{"timestamp": 123, "pythonCode": "test"}]'

        localStorageMock.getItem.mockImplementation(key => {
            switch (key) {
                case "skyide_python_code":
                    return savedPython
                case "skyide_blocks_json":
                    return savedBlocks
                case "skyide_conversion_history":
                    return savedHistory
                default:
                    return null
            }
        })

        const { result } = renderHook(() => usePythonToBlocks({ autoLoad: true }))

        expect(result.current.pythonCode).toBe(savedPython)
        expect(result.current.blocksJson).toEqual(JSON.parse(savedBlocks))
        expect(result.current.conversionHistory).toEqual(JSON.parse(savedHistory))
    })

    it("clears all data when clearOnMount is true", () => {
        const { result } = renderHook(() => usePythonToBlocks({ clearOnMount: true }))

        expect(localStorageMock.removeItem).toHaveBeenCalledWith("skyide_python_code")
        expect(localStorageMock.removeItem).toHaveBeenCalledWith("skyide_blocks_json")
        expect(localStorageMock.removeItem).toHaveBeenCalledWith("skyide_conversion_history")
        expect(localStorageMock.removeItem).toHaveBeenCalledWith("skyide_last_conversion")

        expect(result.current.pythonCode).toBe("")
        expect(result.current.blocksJson).toBeNull()
        expect(result.current.conversionHistory).toEqual([])
    })

    it("updates Python code and persists to localStorage", () => {
        const { result } = renderHook(() => usePythonToBlocks())

        const newCode = 'print("updated code")'

        act(() => {
            result.current.updatePythonCode(newCode)
        })

        expect(result.current.pythonCode).toBe(newCode)
        expect(localStorageMock.setItem).toHaveBeenCalledWith("skyide_python_code", newCode)
    })

    it("handles conversion with async converter function", async () => {
        const { result } = renderHook(() => usePythonToBlocks())

        // Set some Python code first
        act(() => {
            result.current.updatePythonCode('print("test")')
        })

        const mockConverter = vi.fn().mockResolvedValue({
            json: { blocks: [{ type: "print" }] },
            pythonCode: 'print("test")'
        })

        let conversionPromise
        act(() => {
            conversionPromise = result.current.convertPythonToBlocks(mockConverter)
        })

        // Should be converting
        expect(result.current.isConverting).toBe(true)
        expect(result.current.conversionError).toBeNull()

        await act(async () => {
            await conversionPromise
        })

        // Should have completed conversion
        expect(result.current.isConverting).toBe(false)
        expect(result.current.blocksJson).toEqual({
            json: { blocks: [{ type: "print" }] },
            pythonCode: 'print("test")'
        })
        expect(mockConverter).toHaveBeenCalledWith(result.current.pythonCode)
    })

    it("handles conversion errors", async () => {
        const { result } = renderHook(() => usePythonToBlocks())

        // Set some Python code first
        act(() => {
            result.current.updatePythonCode('print("test")')
        })

        const errorMessage = "Conversion failed"
        const mockConverter = vi.fn().mockRejectedValue(new Error(errorMessage))

        let conversionPromise
        act(() => {
            conversionPromise = result.current.convertPythonToBlocks(mockConverter)
        })

        await act(async () => {
            try {
                await conversionPromise
            } catch (error) {
                console.log(error)
                // Expected to throw
            }
        })

        expect(result.current.isConverting).toBe(false)
        expect(result.current.conversionError).toBe(errorMessage)
        expect(result.current.blocksJson).toBeNull()
    })

    it("stores conversion history", async () => {
        const { result } = renderHook(() => usePythonToBlocks())

        const pythonCode = 'print("test")'
        const expectedResult = { json: { blocks: [] }, pythonCode }

        act(() => {
            result.current.updatePythonCode(pythonCode)
        })

        const mockConverter = vi.fn().mockResolvedValue(expectedResult)

        await act(async () => {
            await result.current.convertPythonToBlocks(mockConverter)
        })

        expect(result.current.conversionHistory).toHaveLength(1)
        expect(result.current.conversionHistory[0]).toMatchObject({
            pythonCode,
            success: true,
            timestamp: expect.any(String),
            id: expect.any(Number)
        })

        // Should persist to localStorage (conversion history call happens 4th)
        expect(localStorageMock.setItem).toHaveBeenNthCalledWith(
            4,
            "skyide_conversion_history",
            expect.stringContaining('"pythonCode":"print(\\"test\\")"')
        )
    })

    it("limits conversion history to maximum entries", async () => {
        const { result } = renderHook(() => usePythonToBlocks())

        const mockConverter = vi.fn()
        const maxEntries = 10

        // Add max + 1 conversions
        for (let i = 0; i <= maxEntries; i++) {
            const code = `print(${i})`
            mockConverter.mockResolvedValue({
                json: { blocks: [{ type: "print" }] },
                pythonCode: code
            })

            act(() => {
                result.current.updatePythonCode(code)
            })

            await act(async () => {
                await result.current.convertPythonToBlocks(mockConverter)
            })
        }

        // Should still have max entries, with oldest removed
        expect(result.current.conversionHistory).toHaveLength(maxEntries)
        expect(result.current.conversionHistory[0].pythonCode).toBe("print(10)") // Most recent first
        expect(result.current.conversionHistory[maxEntries - 1].pythonCode).toBe("print(1)") // Oldest kept
    })

    it("loads recent conversion correctly", () => {
        const recentTimestamp = Date.now().toString()
        const recentBlocks = { blocks: [{ type: "recent" }] }

        localStorageMock.getItem.mockImplementation(key => {
            if (key === "skyide_last_conversion") {
                return recentTimestamp
            }
            if (key === "skyide_blocks_json") {
                return JSON.stringify(recentBlocks)
            }
            return null
        })

        const { result } = renderHook(() => usePythonToBlocks({ autoLoad: true }))

        // After autoLoad, should have loaded the blocks
        expect(result.current.blocksJson).toEqual(recentBlocks)

        // loadRecentConversion should return the current blocks if recent
        const loaded = result.current.loadRecentConversion()
        expect(loaded).toEqual(recentBlocks)
    })

    it("loads saved Python code", () => {
        const savedCode = "saved Python code"
        localStorageMock.getItem.mockReturnValue(savedCode)

        const { result } = renderHook(() => usePythonToBlocks())

        act(() => {
            result.current.loadSavedPythonCode()
        })

        expect(result.current.pythonCode).toBe(savedCode)
        expect(localStorageMock.getItem).toHaveBeenCalledWith("skyide_python_code")
    })

    it("checks if has recent conversion", () => {
        const { result } = renderHook(() => usePythonToBlocks())

        // Initially no recent conversion
        expect(result.current.hasRecentConversion()).toBe(false)

        // Mock having recent conversion (timestamp within 1 hour)
        localStorageMock.getItem.mockReturnValue(Date.now().toString())

        expect(result.current.hasRecentConversion()).toBe(true)
    })

    it("provides statistics about stored data", () => {
        localStorageMock.getItem.mockImplementation(key => {
            switch (key) {
                case "skyide_python_code":
                    return "stored code"
                case "skyide_blocks_json":
                    return JSON.stringify({ blocks: [] })
                case "skyide_last_conversion":
                    return Date.now().toString()
                default:
                    return null
            }
        })

        const { result } = renderHook(() => usePythonToBlocks({ autoLoad: true }))

        const stats = result.current.getStats()

        expect(stats.hasStoredCode).toBe(true)
        expect(stats.hasStoredBlocks).toBe(true)
        expect(stats.lastConversionAge).toBeLessThan(1000) // Recent
    })

    it("handles corrupted localStorage data gracefully", () => {
        // Mock corrupted JSON data
        localStorageMock.getItem.mockImplementation(key => {
            if (key === "skyide_conversion_history") {
                return "invalid json"
            }
            return null
        })

        // Should not throw error
        const { result } = renderHook(() => usePythonToBlocks({ autoLoad: true }))

        expect(result.current.conversionHistory).toEqual([])
    })

    it("clears all stored data", () => {
        const { result } = renderHook(() => usePythonToBlocks())

        act(() => {
            result.current.clearAll()
        })

        expect(localStorageMock.removeItem).toHaveBeenCalledWith("skyide_python_code")
        expect(localStorageMock.removeItem).toHaveBeenCalledWith("skyide_blocks_json")
        expect(localStorageMock.removeItem).toHaveBeenCalledWith("skyide_conversion_history")
        expect(localStorageMock.removeItem).toHaveBeenCalledWith("skyide_last_conversion")

        expect(result.current.pythonCode).toBe("")
        expect(result.current.blocksJson).toBeNull()
        expect(result.current.conversionHistory).toEqual([])
        expect(result.current.conversionError).toBeNull()
    })

    it("handles empty conversion result", async () => {
        const { result } = renderHook(() => usePythonToBlocks())

        // Set some Python code first
        act(() => {
            result.current.updatePythonCode('print("test")')
        })

        const mockConverter = vi.fn().mockResolvedValue(null)

        let conversionResult
        await act(async () => {
            conversionResult = await result.current.convertPythonToBlocks(mockConverter)
        })

        expect(conversionResult).toBeNull()
        expect(result.current.conversionError).toBeTruthy()
    })

    it("persists blocks JSON to localStorage after conversion", async () => {
        const { result } = renderHook(() => usePythonToBlocks())

        // Set some Python code first
        act(() => {
            result.current.updatePythonCode('print("test")')
        })

        const expectedBlocks = { blocks: [{ type: "test" }] }
        const mockConverter = vi.fn().mockResolvedValue(expectedBlocks)

        await act(async () => {
            await result.current.convertPythonToBlocks(mockConverter)
        })

        expect(localStorageMock.setItem).toHaveBeenCalledWith(
            "skyide_blocks_json",
            JSON.stringify(expectedBlocks)
        )
    })

    it("handles multiple rapid conversions correctly", async () => {
        const { result } = renderHook(() => usePythonToBlocks())

        // Set some Python code first
        act(() => {
            result.current.updatePythonCode('print("test")')
        })

        const mockConverter1 = vi.fn().mockResolvedValue({ blocks: [{ type: "test1" }] })
        const mockConverter2 = vi.fn().mockResolvedValue({ blocks: [{ type: "test2" }] })

        // Start two conversions rapidly
        let promise1, promise2
        act(() => {
            promise1 = result.current.convertPythonToBlocks(mockConverter1)
            promise2 = result.current.convertPythonToBlocks(mockConverter2)
        })

        await act(async () => {
            await Promise.all([promise1, promise2])
        })

        // Both should complete, latest should win
        expect(result.current.isConverting).toBe(false)
        expect(result.current.blocksJson).toBeTruthy()
    })
})
