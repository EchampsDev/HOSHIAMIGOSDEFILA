import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { firebaseStorage, isFirebaseConfigured } from '../../../infrastructure/firebase/client'
import { validatePhotoFile } from '../../media/domain/photoValidation'
import { isR2MediaConfigured, r2Request } from '../../../infrastructure/r2/client'
import type { NewsImage } from '../domain/types'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const configuredProvider = import.meta.env.VITE_NEWS_IMAGE_PROVIDER === 'github'
  ? 'github'
  : import.meta.env.VITE_NEWS_IMAGE_PROVIDER === 'firebase'
    ? 'firebase'
    : isR2MediaConfigured ? 'r2' : 'github'

type R2UploadResponse = { objectKey: string; readUrl: string }

function normalizeGithubUrl(value: string) {
  const url = value.trim()
  if (/^\/news\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(url) && !url.includes('..')) return url

  try {
    const parsed = new URL(url)
    const isRawGithub = parsed.protocol === 'https:' && parsed.hostname === 'raw.githubusercontent.com'
    const isGithubRawRoute = parsed.protocol === 'https:' && parsed.hostname === 'github.com' && parsed.pathname.includes('/raw/')
    if (isRawGithub || isGithubRawRoute) return parsed.toString()
  } catch {
    // El mensaje único de validación se muestra abajo.
  }
  throw new Error('Usa una ruta /news/... versionada en el repositorio o una URL pública raw.githubusercontent.com.')
}

export const newsImageRepository = {
  provider: configuredProvider,
  supportsFileUpload: configuredProvider === 'firebase' || configuredProvider === 'r2',
  addGithubImage(url: string, alt: string, order: number): NewsImage {
    return { url: normalizeGithubUrl(url), alt: alt.trim(), order, provider: 'github' }
  },
  async upload(newsId: string, files: File[], firebaseIdToken?: string): Promise<NewsImage[]> {
    if (configuredProvider === 'r2') {
      if (!firebaseIdToken) throw new Error('Inicia sesión como administrador para subir imágenes.')
      return Promise.all(files.map(async (file, order) => {
        const validation = await validatePhotoFile(file)
        const response = await r2Request('/v1/news-images', { method: 'POST', body: file, headers: { 'Content-Type': validation.mimeType, 'X-News-Id': newsId, Authorization: `Bearer ${firebaseIdToken}` } })
        const stored = await response.json() as R2UploadResponse
        return { url: stored.readUrl, alt: '', order, provider: 'r2' as const, objectKey: stored.objectKey }
      }))
    }
    if (configuredProvider !== 'firebase') throw new Error('La carga directa está desactivada. Añade primero la imagen al repositorio y pega su ruta pública.')
    if (!isFirebaseConfigured) throw new Error('Firebase no está configurado.')
    const storage = firebaseStorage
    if (!storage) throw new Error('Firebase Storage no está configurado.')
    return Promise.all(files.map(async (file, order) => {
      if (!file.type.startsWith('image/') || file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name}: usa una imagen de máximo 10 MB.`)
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-')
      const target = ref(storage, `news/${newsId}/${crypto.randomUUID()}-${safeName}`)
      await uploadBytes(target, file, { contentType: file.type, cacheControl: 'public,max-age=86400' })
      return { url: await getDownloadURL(target), alt: '', order, provider: 'firebase', storagePath: target.fullPath }
    }))
  },
  async remove(image: NewsImage, firebaseIdToken?: string) {
    if (image.provider !== 'r2' || !image.objectKey || !firebaseIdToken) return
    await r2Request(`/v1/media/${image.objectKey}`, { method: 'DELETE', headers: { Authorization: `Bearer ${firebaseIdToken}` } })
  },
}
