// ide-frontend/src/components/PythonToBlocksDemo.jsx
import React, { useState } from "react"
import { usePythonToBlocks } from "../hooks/usePythonToBlocks.js"

const SAMPLE_PYTHON_CODES = [
    {
        name: "Simple Variable",
        code: "x = 10\nprint(x)"
    },
    {
        name: "Function",
        code: 'def greet(name):\n    print("Hello", name)\n\ngreet("World")'
    },
    {
        name: "Loop",
        code: "for i in range(5):\n    print(i)"
    },
    {
        name: "If Statement",
        code: 'x = 10\nif x > 5:\n    print("Big number")\nelse:\n    print("Small number")'
    },
    {
        name: "List Operations",
        code: "numbers = [1, 2, 3, 4, 5]\nfor num in numbers:\n    print(num * 2)"
    }
]

export default function PythonToBlocksDemo({ onImportBlocks }) {
    const {
        pythonCode,
        // blocksJson,
        isConverting,
        conversionError,
        conversionHistory,
        updatePythonCode,
        convertPythonToBlocks,
        clearAll,
        getStats
    } = usePythonToBlocks()

    const [selectedSample, setSelectedSample] = useState("")

    const stats = getStats()

    const handleLoadSample = code => {
        updatePythonCode(code)
        setSelectedSample(code)
    }

    const handleConvert = async () => {
        // Mock conversion function for demo
        const mockConvertFn = async code => {
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000))

            // Create a simple mock blocks JSON structure
            const mockBlocks = {
                blocks: {
                    languageVersion: 0,
                    blocks: [
                        {
                            type: "ast_Comment",
                            id: "demo_block_" + Date.now(),
                            x: 10,
                            y: 10,
                            fields: {
                                TEXT: `Converted from Python:\n${code.substring(0, 50)}...`
                            }
                        }
                    ]
                }
            }

            return mockBlocks
        }

        const result = await convertPythonToBlocks(mockConvertFn)
        if (result && onImportBlocks) {
            onImportBlocks(result)
        }
    }

    return (
        <div
            style={{
                background: "#f8f9fa",
                border: "1px solid #e9ecef",
                borderRadius: "8px",
                padding: "20px",
                margin: "10px 0"
            }}
        >
            <h3 style={{ margin: "0 0 15px 0" }}>🐍 Python to Blocks Demo</h3>

            {/* Stats Display */}
            <div
                style={{
                    background: "#e3f2fd",
                    padding: "10px",
                    borderRadius: "4px",
                    marginBottom: "15px",
                    fontSize: "14px"
                }}
            >
                <strong>Statistics:</strong> {stats.totalConversions} conversions (
                {stats.successfulConversions} successful, {stats.failedConversions} failed)
                {stats.hasStoredCode && <span> • Has stored Python code</span>}
                {stats.hasStoredBlocks && <span> • Has stored blocks</span>}
            </div>

            {/* Sample Code Selector */}
            <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                    Sample Python Code:
                </label>
                <select
                    value={selectedSample}
                    onChange={e => handleLoadSample(e.target.value)}
                    style={{
                        width: "100%",
                        padding: "8px",
                        border: "1px solid #ddd",
                        borderRadius: "4px"
                    }}
                >
                    <option value="">Select a sample...</option>
                    {SAMPLE_PYTHON_CODES.map((sample, index) => (
                        <option key={index} value={sample.code}>
                            {sample.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Current Python Code Display */}
            <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                    Current Python Code:
                </label>
                <textarea
                    value={pythonCode}
                    onChange={e => updatePythonCode(e.target.value)}
                    placeholder="Enter Python code here..."
                    style={{
                        width: "100%",
                        height: "120px",
                        padding: "8px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontFamily: "monospace",
                        fontSize: "14px",
                        resize: "vertical"
                    }}
                />
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                <button
                    onClick={handleConvert}
                    disabled={isConverting || !pythonCode.trim()}
                    style={{
                        background: isConverting ? "#ccc" : "#007bff",
                        color: "white",
                        border: "none",
                        padding: "10px 15px",
                        borderRadius: "4px",
                        cursor: isConverting ? "not-allowed" : "pointer"
                    }}
                >
                    {isConverting ? "Converting..." : "Convert to Blocks"}
                </button>

                <button
                    onClick={clearAll}
                    style={{
                        background: "#dc3545",
                        color: "white",
                        border: "none",
                        padding: "10px 15px",
                        borderRadius: "4px",
                        cursor: "pointer"
                    }}
                >
                    Clear All
                </button>
            </div>

            {/* Error Display */}
            {conversionError && (
                <div
                    style={{
                        background: "#f8d7da",
                        color: "#721c24",
                        border: "1px solid #f5c6cb",
                        padding: "10px",
                        borderRadius: "4px",
                        marginBottom: "15px"
                    }}
                >
                    <strong>Error:</strong> {conversionError}
                </div>
            )}

            {/* Conversion History */}
            {conversionHistory.length > 0 && (
                <div>
                    <h4 style={{ margin: "15px 0 10px 0" }}>Recent Conversions:</h4>
                    <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                        {conversionHistory.slice(0, 5).map(entry => (
                            <div
                                key={entry.id}
                                style={{
                                    background: entry.success ? "#d4edda" : "#f8d7da",
                                    border: `1px solid ${entry.success ? "#c3e6cb" : "#f5c6cb"}`,
                                    padding: "8px",
                                    margin: "5px 0",
                                    borderRadius: "4px",
                                    fontSize: "12px"
                                }}
                            >
                                <div style={{ fontWeight: "bold" }}>
                                    {entry.success ? "✅" : "❌"}{" "}
                                    {new Date(entry.timestamp).toLocaleTimeString()}
                                </div>
                                <div style={{ opacity: 0.8, marginTop: "2px" }}>
                                    {entry.pythonCode}
                                </div>
                                {entry.error && (
                                    <div style={{ color: "#721c24", marginTop: "2px" }}>
                                        Error: {entry.error}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
