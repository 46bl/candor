// background.js — MV3 service worker
// Relays analysis requests from popup → Candor API.
// Passes account number and optional custom AI settings.
// Nothing is stored in the service worker itself.

'use strict'

// In Chrome (service worker): importScripts loads compat.js now.
// In Firefox (background script): compat.js is listed first in manifest scripts[], already loaded.
if (typeof importScripts === 'function') importScripts('compat.js')

api.runtime.onInstalled.addListener(() => {
  console.log('[CANDOR] Extension installed. No data collected.')
})

api.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'ANALYZE') {
    handleAnalyze(message.input, message.accountNumber, message.customAI)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message || 'Analysis failed' }))
    return true
  }
  if (message.type === 'GET_API_URL') {
    getApiUrl().then(sendResponse)
    return true
  }
})

async function handleAnalyze(input, accountNumber, customAI) {
  if (!input || typeof input !== 'string' || input.trim().length < 2) {
    throw new Error('Invalid product input')
  }
  const apiUrl = await getApiUrl()

  const payload = { input: input.trim(), accountNumber }
  if (customAI && customAI.provider) payload.customAI = customAI

  const res = await fetch(`${apiUrl}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'omit',
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(body.error || `Server returned ${res.status}`)
  }

  return res.json()
}

async function getApiUrl() {
  try {
    const stored = await api.storage.local.get('apiUrl')
    return stored.apiUrl || 'http://localhost:3000'
  } catch {
    return 'http://localhost:3000'
  }
}
