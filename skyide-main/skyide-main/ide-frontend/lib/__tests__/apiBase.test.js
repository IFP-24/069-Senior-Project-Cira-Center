import { describe, expect, it } from "vitest"

import {
    readJsonResponse,
    resolveApiBaseUrl,
    resolveApiV1BaseUrl,
} from "../apiBase.js"

describe("apiBase", () => {
    it("prefers explicit auth API env values", () => {
        expect(resolveApiBaseUrl("https://api.example.com/api/")).toBe(
            "https://api.example.com/api"
        )
    })

    it("prefers explicit v1 API env values", () => {
        expect(resolveApiV1BaseUrl("https://api.example.com/api/v1/")).toBe(
            "https://api.example.com/api/v1"
        )
    })

    it("falls back to localhost for local browser hosts", () => {
        const location = {
            origin: "http://localhost:3000",
            hostname: "localhost",
        }

        expect(resolveApiBaseUrl("", location)).toBe("http://127.0.0.1:5055/api")
        expect(resolveApiV1BaseUrl("", location)).toBe("http://127.0.0.1:5055/api/v1")
    })

    it("uses the public backend port for non-local dev-style frontend ports", () => {
        const location = {
            origin: "http://skyscrapergames.org:3000",
            hostname: "skyscrapergames.org",
            port: "3000",
            protocol: "http:",
        }

        expect(resolveApiBaseUrl("", location)).toBe("http://skyscrapergames.org:5055/api")
        expect(resolveApiV1BaseUrl("", location)).toBe(
            "http://skyscrapergames.org:5055/api/v1"
        )
    })

    it("uses same-origin api routes for standard production ports", () => {
        const location = {
            origin: "https://skyscrapergames.org",
            hostname: "skyscrapergames.org",
            port: "",
            protocol: "https:",
        }

        expect(resolveApiBaseUrl("", location)).toBe("https://skyscrapergames.org/api")
        expect(resolveApiV1BaseUrl("", location)).toBe("https://skyscrapergames.org/api/v1")
    })

    it("returns parsed JSON bodies", async () => {
        const response = new Response(JSON.stringify({ message: "ok" }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
            },
        })

        await expect(readJsonResponse(response)).resolves.toEqual({ message: "ok" })
    })

    it("returns a status-based error when the body is not JSON", async () => {
        const response = new Response("<html>bad gateway</html>", {
            status: 502,
            statusText: "Bad Gateway",
            headers: {
                "Content-Type": "text/html",
            },
        })

        await expect(readJsonResponse(response)).resolves.toEqual({
            error: "502 Bad Gateway",
        })
    })
})
