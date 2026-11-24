import { useState, useEffect, useCallback } from "react"

const STORAGE_KEYS = {
    PYTHON_CODE: "skyide_python_code",
    BLOCKS_JSON: "skyide_blocks_json",
    CONVERSION_HISTORY: "skyide_conversion_history",
    LAST_CONVERSION: "skyide_last_conversion"
}

/**
 * Custom hook to manage Python-to-blocks conversion state
 * Handles persistence across page navigation and reloads
 */
export function usePythonToBlocks(options = {}) {
    const { autoLoad = false, clearOnMount = false } = options
    // State for Python code and blocks
    const [pythonCode, setPythonCode] = useState("")
    const [blocksJson, setBlocksJson] = useState(null)
    const [isConverting, setIsConverting] = useState(false)
    const [conversionError, setConversionError] = useState(null)
    const [conversionHistory, setConversionHistory] = useState([])

    // Load persisted state on mount (only if autoLoad is enabled)
    useEffect(
        () => {
            if (clearOnMount) {
                // Clear everything on mount
                clearAll()
                return
            }

            if (!autoLoad) {
                // Only load history, not the actual Python code
                try {
                    const savedHistory = localStorage.getItem(STORAGE_KEYS.CONVERSION_HISTORY)
                    if (savedHistory) {
                        const parsed = JSON.parse(savedHistory)
                        setConversionHistory(parsed)
                    }
                } catch (error) {
                    console.warn("Failed to load conversion history from localStorage:", error)
                }
                return
            }

            // Full auto-load (original behavior)
            try {
                const savedPython = localStorage.getItem(STORAGE_KEYS.PYTHON_CODE)
                const savedBlocks = localStorage.getItem(STORAGE_KEYS.BLOCKS_JSON)
                const savedHistory = localStorage.getItem(STORAGE_KEYS.CONVERSION_HISTORY)

                if (savedPython) {
                    setPythonCode(savedPython)
                }

                if (savedBlocks) {
                    const parsed = JSON.parse(savedBlocks)
                    setBlocksJson(parsed)
                }

                if (savedHistory) {
                    const parsed = JSON.parse(savedHistory)
                    setConversionHistory(parsed)
                }
            } catch (error) {
                console.warn("Failed to load Python-to-blocks state from localStorage:", error)
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [autoLoad, clearOnMount]
    )

    // Persist Python code changes
    const updatePythonCode = useCallback(code => {
        setPythonCode(code)
        try {
            localStorage.setItem(STORAGE_KEYS.PYTHON_CODE, code)
        } catch (error) {
            console.warn("Failed to save Python code to localStorage:", error)
        }
    }, [])

    // Persist blocks JSON
    const updateBlocksJson = useCallback(json => {
        setBlocksJson(json)
        try {
            if (json) {
                localStorage.setItem(STORAGE_KEYS.BLOCKS_JSON, JSON.stringify(json))
                localStorage.setItem(STORAGE_KEYS.LAST_CONVERSION, Date.now().toString())
            }
        } catch (error) {
            console.warn("Failed to save blocks JSON to localStorage:", error)
        }
    }, [])

    // Add conversion to history
    const addToHistory = useCallback((pythonCode, blocksJson, success = true, error = null) => {
        const entry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            pythonCode: pythonCode.substring(0, 200), // Truncate for storage
            success,
            error: error?.message || null,
            blocksCount: (success && blocksJson?.blocks?.blocks?.length) || 0
        }

        setConversionHistory(prev => {
            const updated = [entry, ...prev.slice(0, 9)] // Keep last 10 entries
            try {
                localStorage.setItem(STORAGE_KEYS.CONVERSION_HISTORY, JSON.stringify(updated))
            } catch (error) {
                console.warn("Failed to save conversion history:", error)
            }
            return updated
        })
    }, [])

    // Convert Python to blocks with error handling and persistence
    const convertPythonToBlocks = useCallback(
        async (convertFn, codeOverride) => {
            const codeToConvert =
                (typeof codeOverride === "string" ? codeOverride : pythonCode) || ""

            if (!codeToConvert.trim()) {
                setConversionError("Please enter some Python code first")
                return null
            }

            setIsConverting(true)
            setConversionError(null)

            try {
                // Call the actual conversion function (from BlockMirrorDock)
                const result = await convertFn(codeToConvert)

                if (result) {
                    updateBlocksJson(result)
                    addToHistory(codeToConvert, result, true)
                    setConversionError(null)
                    return result
                } else {
                    throw new Error("Conversion returned empty result")
                }
            } catch (error) {
                const errorMessage = error.message || "Failed to convert Python to blocks"
                setConversionError(errorMessage)
                addToHistory(codeToConvert, null, false, error)
                console.error("[usePythonToBlocks] Conversion failed:", error)
                return null
            } finally {
                setIsConverting(false)
            }
        },
        [pythonCode, updateBlocksJson, addToHistory]
    )

    // Check if there's a recent conversion available
    const hasRecentConversion = useCallback(() => {
        try {
            const lastConversion = localStorage.getItem(STORAGE_KEYS.LAST_CONVERSION)
            if (!lastConversion) return false

            const timestamp = parseInt(lastConversion)
            const now = Date.now()
            const oneHour = 60 * 60 * 1000

            return now - timestamp < oneHour // Consider recent if within 1 hour
        } catch {
            return false
        }
    }, [])

    // Load the most recent conversion result
    const loadRecentConversion = useCallback(() => {
        if (hasRecentConversion() && blocksJson) {
            return blocksJson
        }
        return null
    }, [hasRecentConversion, blocksJson])

    // Manually load saved Python code (for user-initiated actions)
    const loadSavedPythonCode = useCallback(() => {
        try {
            const savedPython = localStorage.getItem(STORAGE_KEYS.PYTHON_CODE)
            if (savedPython) {
                setPythonCode(savedPython)
                return savedPython
            }
        } catch (error) {
            console.warn("Failed to load saved Python code:", error)
        }
        return null
    }, [])

    // Clear all stored data
    const clearAll = useCallback(() => {
        setPythonCode("")
        setBlocksJson(null)
        setConversionError(null)
        setConversionHistory([])

        Object.values(STORAGE_KEYS).forEach(key => {
            try {
                localStorage.removeItem(key)
            } catch (error) {
                console.warn(`Failed to remove ${key} from localStorage:`, error)
            }
        })
    }, [])

    // Get summary statistics
    const getStats = useCallback(() => {
        const successful = conversionHistory.filter(entry => entry.success).length
        const failed = conversionHistory.length - successful
        const lastSuccess = conversionHistory.find(entry => entry.success)

        // Calculate last conversion age
        let lastConversionAge = undefined
        try {
            const lastConversion = localStorage.getItem(STORAGE_KEYS.LAST_CONVERSION)
            if (lastConversion) {
                const timestamp = parseInt(lastConversion)
                lastConversionAge = Date.now() - timestamp
            }
        } catch {
            // Ignore errors
        }

        return {
            totalConversions: conversionHistory.length,
            successfulConversions: successful,
            failedConversions: failed,
            lastSuccessfulConversion: lastSuccess?.timestamp || null,
            hasStoredCode: !!pythonCode.trim(),
            hasStoredBlocks: !!blocksJson,
            lastConversionAge
        }
    }, [conversionHistory, pythonCode, blocksJson])

    return {
        // State
        pythonCode,
        blocksJson,
        isConverting,
        conversionError,
        conversionHistory,

        // Actions
        updatePythonCode,
        updateBlocksJson,
        convertPythonToBlocks,
        loadRecentConversion,
        loadSavedPythonCode,
        clearAll,

        // Utilities
        hasRecentConversion,
        getStats
    }
}
