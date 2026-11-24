// src/main.jsx
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App.jsx"

// If you import Blockly anywhere as a module, also expose it globally
// so the UMD AST-blocks script can find it.
import * as Blockly from "blockly"
if (!window.Blockly) window.Blockly = Blockly

/**
 * Load BlockMirror's Python AST -> Blockly block definitions into THIS page context.
 * These are needed only so your main workspace can import JSON that contains ast_* blocks.
 * (The BlockMirror iframe loads its own copy, separately.)
 */
// eslint-disable-next-line no-unused-vars
async function loadAstBlocksUMD() {
    const PRIMARY =
        "https://cdn.jsdelivr.net/gh/blockpy-edu/BlockMirror@master/dist/block_mirror_python_blocks.js"
    const FALLBACK = "https://cdn.jsdelivr.net/npm/blockmirror/dist/block_mirror_python_blocks.js"

    const withScript = src =>
        new Promise((resolve, reject) => {
            const s = document.createElement("script")
            s.src = src
            s.async = true
            s.onload = () => resolve(src)
            s.onerror = () => reject(new Error("Failed to load " + src))
            document.head.appendChild(s)
        })

    // race against a timeout so you aren’t stuck before render
    const timeout = new Promise((_, rej) =>
        setTimeout(() => rej(new Error("AST blocks load timeout")), 10000)
    )

    // Try primary CDN, then fallback
    const attempt = withScript(PRIMARY).catch(() => withScript(FALLBACK))
    console.log("[AST blocks] loading...", attempt)

    return Promise.race([attempt, timeout]).catch(err => {
        console.warn("[AST blocks] load failed:", err)
    })
}

function astBlocksDetected() {
    try {
        // A canonical block that AST pack defines
        return !!(Blockly.Blocks && Blockly.Blocks["ast_Module"])
    } catch {
        return false
    }
}

;(async function bootstrap() {
    // Load the AST blocks pack (non-fatal if it fails)

    // Log what we have so it’s easy to diagnose
    if (astBlocksDetected()) {
        console.log("[AST blocks] Loaded OK (ast_Module found).")
    } else {
        console.warn(
            "[AST blocks] Not detected. Python → Blocks imports may coerce unknown ast_* types " +
                "to placeholders (e.g., ast_Comment)."
        )
    }

    // Mount the app
    const rootEl = document.getElementById("root")
    createRoot(rootEl).render(
        <StrictMode>
            <App />
        </StrictMode>
    )
})()
