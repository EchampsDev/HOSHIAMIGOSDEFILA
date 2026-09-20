const productionWorkerUrl = 'https://brattycharts-media.edwardocampossantana.workers.dev'
const configuredBaseUrl = (import.meta.env.VITE_BRATTYCHARTS_MEDIA_API_URL?.trim() || (import.meta.env.PROD ? productionWorkerUrl : '')).replace(/\/+$/, '')

export const isBrattychartsMediaConfigured = Boolean(configuredBaseUrl)

export async function brattychartsMediaRequest(path: string, token: string, init: RequestInit = {}) {
  if (!configuredBaseUrl) throw new Error('El almacenamiento de Brattycharts no está configurado en este entorno.')
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${configuredBaseUrl}${path}`, { ...init, headers })
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(payload?.error || 'No fue posible comunicarse con el almacenamiento de Brattycharts.')
  }
  return response
}
