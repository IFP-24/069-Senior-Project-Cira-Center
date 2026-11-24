import React from "react"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import BlockMirrorDock from "../../../components/BlockMirrorDock.jsx"

function replyFromBlockMirror(action, requestId, payload = {}) {
    window.dispatchEvent(
        new MessageEvent("message", {
            data: {
                type: "bm->app",
                action,
                requestId,
                payload
            }
        })
    )
}

function installIframeBridge(handlers = {}) {
    const postMessage = vi.fn(message => {
        const { action, requestId, payload } = message || {}

        queueMicrotask(() => {
            if (action === "getPython") {
                replyFromBlockMirror("python", requestId, {
                    code: handlers.getPython?.(payload) ?? ""
                })
                return
            }

            if (action === "setPython") {
                replyFromBlockMirror("ack", requestId, {})
                return
            }

            if (action === "getBlocks") {
                replyFromBlockMirror("blocks", requestId, {
                    json: handlers.getBlocks?.(payload) ?? {
                        blocks: { languageVersion: 0, blocks: [] }
                    }
                })
                return
            }

            replyFromBlockMirror("ack", requestId, {})
        })
    })

    Object.defineProperty(window.HTMLIFrameElement.prototype, "contentWindow", {
        configurable: true,
        get() {
            return { postMessage }
        }
    })

    return postMessage
}

function makeBridge(overrides = {}) {
    return {
        pythonCode: "",
        isConverting: false,
        conversionError: null,
        updatePythonCode: vi.fn(),
        convertPythonToBlocks: vi.fn(async (convertFn, code) => convertFn(code)),
        loadRecentConversion: vi.fn(),
        loadSavedPythonCode: vi.fn(),
        hasRecentConversion: vi.fn(() => false),
        getStats: vi.fn(() => ({ hasStoredCode: false, hasStoredBlocks: false })),
        ...overrides
    }
}

describe("BlockMirrorDock conversion integration", () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it("blocks unsupported Python before showing a success overlay or importing blocks", async () => {
        installIframeBridge({
            getPython: () => 'import math\nprint("debug")\nset_score(1)'
        })

        const onImportBlocks = vi.fn()
        const bridge = makeBridge()

        render(
            <BlockMirrorDock
                visible={true}
                mode="python"
                onImportBlocks={onImportBlocks}
                pythonBridge={bridge}
            />
        )

        await act(async () => {
            window.dispatchEvent(
                new MessageEvent("message", { data: { type: "blockmirror-ready" } })
            )
            await Promise.resolve()
        })

        fireEvent.click(screen.getByRole("button", { name: "Python → Blocks" }))

        await waitFor(() => {
            expect(screen.getByText(/Error:/i)).toBeInTheDocument()
        })

        expect(onImportBlocks).not.toHaveBeenCalled()
        expect(bridge.convertPythonToBlocks).not.toHaveBeenCalled()
        expect(screen.queryByText("Conversion complete!")).not.toBeInTheDocument()
    })

    it("shows success progress and imports blocks for supported Python", async () => {
        installIframeBridge({
            getPython: () => "set_score(1)",
            getBlocks: () => ({
                blocks: {
                    languageVersion: 0,
                    blocks: [{ type: "game_set_score", id: "score-1" }]
                }
            })
        })

        const onImportBlocks = vi.fn(() => true)
        const bridge = makeBridge()

        render(
            <BlockMirrorDock
                visible={true}
                mode="python"
                onImportBlocks={onImportBlocks}
                pythonBridge={bridge}
            />
        )

        await act(async () => {
            window.dispatchEvent(
                new MessageEvent("message", { data: { type: "blockmirror-ready" } })
            )
            await Promise.resolve()
        })

        fireEvent.click(screen.getByRole("button", { name: "Python → Blocks" }))

        await waitFor(() => {
            expect(screen.getByText("Conversion complete!")).toBeInTheDocument()
        })

        expect(onImportBlocks).toHaveBeenCalledTimes(1)
        expect(bridge.convertPythonToBlocks).toHaveBeenCalledTimes(1)
    })
})
