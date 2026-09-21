const productionWorkerUrl = 'https://bratty-special-media.edwardocampossantana.workers.dev'
const configuredBaseUrl = (import.meta.env.VITE_BRATTY_SPECIAL_MEDIA_API_URL?.trim() || (import.meta.env.PROD ? productionWorkerUrl : '')).replace(/\/+$/, '')

export const isBrattySpecialMediaConfigured = Boolean(configuredBaseUrl)

async function readFailure(response: Response) {
  const payload = await response.json().catch(() => null) as { error?: string } | null
  return payload?.error || 'No fue posible comunicarse con el almacenamiento del acceso especial.'
}

export async function brattySpecialMediaRequest(path: string, token: string, init: RequestInit = {}) {
  if (!configuredBaseUrl) throw new Error('La carga de video aún no está configurada en este entorno.')
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${configuredBaseUrl}${path}`, { ...init, headers })
  if (!response.ok) throw new Error(await readFailure(response))
  return response
}

export function uploadBrattySpecialVideoPart(path: string, token: string, chunk: Blob, onProgress: (loaded: number) => void) {
  if (!configuredBaseUrl) return Promise.reject(new Error('La carga de video aún no está configurada en este entorno.'))
  return new Promise<{ partNumber: number; etag: string }>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('PUT', `${configuredBaseUrl}${path}`)
    request.setRequestHeader('Authorization', `Bearer ${token}`)
    request.setRequestHeader('Content-Type', 'application/octet-stream')
    request.upload.onprogress = (event) => onProgress(event.loaded)
    request.onerror = () => reject(new Error('La conexión se interrumpió mientras se cargaba el video.'))
    request.onload = () => {
      let payload: { partNumber?: number; etag?: string; error?: string } = {}
      try { payload = JSON.parse(request.responseText) as typeof payload } catch { /* Respuesta no JSON. */ }
      if (request.status >= 200 && request.status < 300 && payload.partNumber && payload.etag) resolve({ partNumber: payload.partNumber, etag: payload.etag })
      else reject(new Error(payload.error || 'No fue posible cargar una parte del video.'))
    }
    request.send(chunk)
  })
}
