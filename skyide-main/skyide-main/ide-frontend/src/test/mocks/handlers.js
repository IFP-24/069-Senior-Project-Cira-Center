// API handlers for MSW
import { http, HttpResponse } from "msw"

const API_BASE = "http://127.0.0.1:5055/api"

export const handlers = [
    // Auth endpoints
    http.post(`${API_BASE}/auth/login`, async ({ request }) => {
        const { username, password } = await request.json()

        if (username === "testuser" && password === "password") {
            return HttpResponse.json({
                message: "Login successful",
                token: "mock-jwt-token",
                user: {
                    id: 1,
                    username: "testuser",
                    email: "test@example.com"
                }
            })
        }

        return HttpResponse.json({ error: "Invalid username or password" }, { status: 401 })
    }),

    http.post(`${API_BASE}/auth/register`, async ({ request }) => {
        const { username, email, password } = await request.json()

        return HttpResponse.json(
            {
                message: "User registered successfully",
                token: "mock-jwt-token",
                user: {
                    id: 2,
                    username,
                    email
                }
            },
            { status: 201 }
        )
    }),

    http.get(`${API_BASE}/auth/verify`, ({ request }) => {
        const authHeader = request.headers.get("authorization")

        if (authHeader && authHeader.includes("mock-jwt-token")) {
            return HttpResponse.json({
                user: {
                    id: 1,
                    username: "testuser"
                }
            })
        }

        return HttpResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }),

    http.post(`${API_BASE}/auth/logout`, () => {
        return HttpResponse.json({ message: "Logged out successfully" })
    }),

    // Game endpoints
    http.get(`${API_BASE}/games`, () => {
        return HttpResponse.json([
            { id: 1, name: "Tetris", description: "Classic block puzzle game" },
            { id: 2, name: "Snake", description: "Classic snake game" }
        ])
    }),

    http.post(`${API_BASE}/games/start`, () => {
        return HttpResponse.json({
            sessionId: "game-session-123",
            gameState: "initialized"
        })
    }),

    // Health check
    http.get("http://127.0.0.1:5055/health", () => {
        return HttpResponse.json({
            ok: true,
            message: "SkyIDE backend running"
        })
    })
]
