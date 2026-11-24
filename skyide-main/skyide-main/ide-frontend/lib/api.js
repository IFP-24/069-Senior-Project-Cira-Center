import { readJsonResponse, resolveApiV1BaseUrl } from "./apiBase.js"

const API_V1_BASE = resolveApiV1BaseUrl()

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  })

  const data = await readJsonResponse(response)
  if (!response.ok) {
    throw new Error(data.error || `${response.status} ${response.statusText}`)
  }
  return data
}

export function getConfig(gameId) {
  return jsonFetch(`${API_V1_BASE}/games/${encodeURIComponent(gameId)}/config`)
}

export function saveConfig(gameId, config) {
  return jsonFetch(`${API_V1_BASE}/games/${encodeURIComponent(gameId)}/config`, {
    method: "POST",
    body: JSON.stringify(config || {}),
  })
}

export function runGame(gameId) {
  return jsonFetch(`${API_V1_BASE}/games/${encodeURIComponent(gameId)}/run`, {
    method: "POST",
  })
}

export async function exportProject(payload) {
  return Promise.resolve(payload)
}

export function toShareJson(ws) {
  const json = window.Blockly.serialization.workspaces.save(ws)
  return { version: 1, workspace: json }
}
