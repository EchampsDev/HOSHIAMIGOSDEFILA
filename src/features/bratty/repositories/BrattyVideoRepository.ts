import { brattySpecialMediaRequest, isBrattySpecialMediaConfigured, uploadBrattySpecialVideoPart } from '../../../infrastructure/r2/brattySpecialMediaClient'

export const MAX_BRATTY_VIDEO_BYTES = 300 * 1024 * 1024
const allowedTypes = new Set(['video/mp4', 'video/quicktime', 'video/webm'])
const CHUNK_BYTES = 8 * 1024 * 1024

export const brattyVideoRepository = {
  usesFirebase: isBrattySpecialMediaConfigured,
  validate(file: File) {
    if (!allowedTypes.has(file.type)) throw new Error('Usa un video MP4, MOV o WebM.')
    if (file.size > MAX_BRATTY_VIDEO_BYTES) throw new Error('El video debe pesar máximo 300 MB.')
  },
  async upload(file: File, token: string, onProgress: (progress: number) => void) {
    this.validate(file)
    const created = await brattySpecialMediaRequest('/v1/uploads', token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ originalName: file.name, contentType: file.type, size: file.size }) })
    const { sessionId } = await created.json() as { sessionId: string }
    const parts: Array<{ partNumber: number; etag: string }> = []
    let completedBytes = 0
    try {
      for (let offset = 0, partNumber = 1; offset < file.size; offset += CHUNK_BYTES, partNumber += 1) {
        const chunk = file.slice(offset, Math.min(offset + CHUNK_BYTES, file.size))
        const part = await uploadBrattySpecialVideoPart(`/v1/uploads/${encodeURIComponent(sessionId)}/parts/${partNumber}`, token, chunk, (loaded) => onProgress(Math.min(99, Math.round(((completedBytes + loaded) / file.size) * 100))))
        parts.push(part)
        completedBytes += chunk.size
      }
      const completed = await brattySpecialMediaRequest(`/v1/uploads/${encodeURIComponent(sessionId)}/complete`, token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parts }) })
      onProgress(100)
      return await completed.json() as { videoUrl: string; storagePath: string }
    } catch (error) {
      await brattySpecialMediaRequest(`/v1/uploads/${encodeURIComponent(sessionId)}`, token, { method: 'DELETE' }).catch(() => undefined)
      throw error
    }
  },
}
