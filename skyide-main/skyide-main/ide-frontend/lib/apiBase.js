const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"])
const PUBLIC_DEV_FRONTEND_PORTS = new Set(["3000", "5173"])
const BACKEND_PORT = "5055"

function normalizeBaseUrl(url) {
    return String(url || "").replace(/\/$/, "")
}

function isLocalHostname(hostname = "") {
    return LOCAL_HOSTNAMES.has(hostname) || hostname.endsWith(".local")
}

function resolvePublicDevUrl(pathname, location) {
    return `${location.protocol}//${location.hostname}:${BACKEND_PORT}${pathname}`
}

function resolveFromLocation(pathname, localUrl, location = globalThis.window?.location) {
    if (!location?.origin || isLocalHostname(location.hostname)) {
        return localUrl
    }

    if (PUBLIC_DEV_FRONTEND_PORTS.has(location.port)) {
        return resolvePublicDevUrl(pathname, location)
    }

    return new URL(pathname, location.origin).toString()
}

export function resolveApiBaseUrl(
    envUrl = import.meta.env.VITE_API_BASE_URL,
    location = globalThis.window?.location
) {
    return normalizeBaseUrl(
        envUrl || resolveFromLocation("/api", "http://127.0.0.1:5055/api", location)
    )
}

export function resolveApiV1BaseUrl(
    envUrl = import.meta.env.VITE_API_V1_BASE_URL,
    location = globalThis.window?.location
) {
    return normalizeBaseUrl(
        envUrl || resolveFromLocation("/api/v1", "http://127.0.0.1:5055/api/v1", location)
    )
}

export async function readJsonResponse(response) {
    const text = await response.text()

    if (!text) {
        return {}
    }

    try {
        return JSON.parse(text)
    } catch {
        return { error: `${response.status} ${response.statusText}`.trim() }
    }
}
