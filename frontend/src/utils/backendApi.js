const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || '').trim()

export function getApiUrl(path) {
  if (!BACKEND_URL) return path
  return `${BACKEND_URL.replace(/\/$/, '')}${path}`
}

export async function buildAuthenticatedHeaders({ account, chainId, signer, contentType }) {
  const timestamp = Date.now()
  const normalisedAddress = String(account || '').trim().toLowerCase()
  const normalisedChainId = String(chainId || '').trim().toLowerCase()
  const message = [
    'Evidence Registry API Auth',
    `address:${normalisedAddress}`,
    `chainId:${normalisedChainId}`,
    `timestamp:${timestamp}`
  ].join('\n')

  const signature = await signer.signMessage(message)
  const headers = {
    'x-wallet-address': normalisedAddress,
    'x-wallet-signature': signature,
    'x-chain-id': normalisedChainId,
    'x-auth-timestamp': String(timestamp)
  }

  if (contentType) {
    headers['Content-Type'] = contentType
  }

  return headers
}

export async function parseJsonResponse(response, fallbackMessage) {
  const raw = await response.text()
  let payload = null

  try {
    payload = raw ? JSON.parse(raw) : null
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new Error(payload?.error || raw || fallbackMessage)
  }

  if (!payload) {
    throw new Error(fallbackMessage)
  }

  return payload
}
