import { collection, deleteField, doc, onSnapshot, orderBy, query, runTransaction, setDoc, updateDoc } from 'firebase/firestore'
import { firestore, isFirebaseConfigured } from '../../../infrastructure/firebase/client'
import { brattychartsMediaRequest, isBrattychartsMediaConfigured } from '../../../infrastructure/r2/brattychartsClient'
import { backgroundFitValues, backgroundPositionValues, defaultBrattychartsAppearanceSettings, type BrattychartsAppearance, type BrattychartsAppearanceSettings, type BrattychartsBackground } from '../domain/appearance'

const MAX_BACKGROUND_BYTES = 15 * 1024 * 1024
const MAX_VIDEO_BYTES = 100 * 1024 * 1024
const MAX_VIDEO_SECONDS = 5 * 60

const settingsReference = () => {
  if (!firestore) throw new Error('Firebase no está configurado.')
  return doc(firestore, 'brattychartsSettings', 'landing')
}

const backgroundsReference = () => {
  if (!firestore) throw new Error('Firebase no está configurado.')
  return collection(firestore, 'brattychartsBackgrounds')
}

const normalizeSettings = (value: Partial<BrattychartsAppearanceSettings> = {}): BrattychartsAppearanceSettings => ({
  ...defaultBrattychartsAppearanceSettings,
  ...value,
  backgroundIds: Array.isArray(value.backgroundIds) ? value.backgroundIds.filter((item): item is string => typeof item === 'string').slice(0, 20) : [],
  slideshowIntervalMs: Math.min(30_000, Math.max(3_000, Number(value.slideshowIntervalMs) || 8_000)),
  transitionMs: Math.min(5_000, Math.max(200, Number(value.transitionMs) || 1_200)),
  videoEnabled: Boolean(value.videoEnabled && value.videoUrl),
})

const normalizeBackground = (id: string, value: Partial<BrattychartsBackground>): BrattychartsBackground | null => {
  if (!value.imageUrl || !value.storagePath) return null
  return {
    id,
    name: String(value.name || 'Fondo sin nombre').slice(0, 100),
    imageUrl: value.imageUrl,
    storagePath: value.storagePath,
    enabled: value.enabled !== false,
    selected: value.selected !== false,
    order: Number(value.order) || 0,
    fit: backgroundFitValues.includes(value.fit as typeof backgroundFitValues[number]) ? value.fit as BrattychartsBackground['fit'] : 'cover',
    position: backgroundPositionValues.includes(value.position as typeof backgroundPositionValues[number]) ? value.position as BrattychartsBackground['position'] : 'center center',
    overlayOpacity: Math.min(.85, Math.max(0, Number(value.overlayOpacity) || 0)),
    blurPx: Math.min(16, Math.max(0, Number(value.blurPx) || 0)),
    createdAt: value.createdAt || '',
    updatedAt: value.updatedAt || '',
  }
}

const videoDuration = (file: File) => new Promise<number>((resolve, reject) => {
  const video = document.createElement('video')
  const url = URL.createObjectURL(file)
  video.preload = 'metadata'
  video.onloadedmetadata = () => { const duration = video.duration; URL.revokeObjectURL(url); resolve(duration) }
  video.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No fue posible leer la duración del video.')) }
  video.src = url
})

export const brattychartsAppearanceRepository = {
  usesFirebase: isFirebaseConfigured,
  subscribe(listener: (value: BrattychartsAppearance) => void, onError: (error: unknown) => void) {
    if (!firestore) { listener({ settings: defaultBrattychartsAppearanceSettings, backgrounds: [] }); return undefined }
    let settings = defaultBrattychartsAppearanceSettings
    let backgrounds: BrattychartsBackground[] = []
    const notify = () => listener({ settings, backgrounds })
    const stopSettings = onSnapshot(settingsReference(), (snapshot) => { settings = normalizeSettings(snapshot.exists() ? snapshot.data() : {}); notify() }, onError)
    const stopBackgrounds = onSnapshot(query(backgroundsReference(), orderBy('order', 'asc')), (snapshot) => {
      backgrounds = snapshot.docs.map((item) => normalizeBackground(item.id, item.data())).filter((item): item is BrattychartsBackground => Boolean(item))
      notify()
    }, onError)
    return () => { stopSettings(); stopBackgrounds() }
  },
  async uploadBackground(file: File, token: string) {
    if (!firestore || !isBrattychartsMediaConfigured) throw new Error('El almacenamiento de Brattycharts no está configurado.')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > MAX_BACKGROUND_BYTES) throw new Error('Usa JPG, PNG o WebP de máximo 15 MB.')
    const id = crypto.randomUUID()
    const upload = await brattychartsMediaRequest('/v1/backgrounds', token, { method: 'POST', headers: { 'Content-Type': file.type, 'X-Background-Id': id }, body: file })
    const stored = await upload.json() as { objectKey: string; readUrl: string }
    const now = new Date().toISOString()
    const item: BrattychartsBackground = { id, name: file.name.replace(/\.[^.]+$/, '').slice(0, 100) || 'Nuevo fondo', imageUrl: stored.readUrl, storagePath: stored.objectKey, enabled: true, selected: true, order: Date.now(), fit: 'cover', position: 'center center', overlayOpacity: .28, blurPx: 0, createdAt: now, updatedAt: now }
    try {
      await runTransaction(firestore, async (transaction) => {
        const settingsSnapshot = await transaction.get(settingsReference())
        const settings = normalizeSettings(settingsSnapshot.exists() ? settingsSnapshot.data() : {})
        if (settings.backgroundIds.length >= 20) throw new Error('Ya alcanzaste el máximo de 20 fondos guardados.')
        transaction.set(doc(backgroundsReference(), id), item)
        transaction.set(settingsReference(), { ...settings, backgroundIds: [...settings.backgroundIds, id], updatedAt: now })
      })
      return item
    } catch (error) {
      await brattychartsMediaRequest(`/v1/media/${encodeURIComponent(stored.objectKey).replace('%2F', '/')}`, token, { method: 'DELETE' }).catch(() => undefined)
      throw error
    }
  },
  async updateBackground(id: string, patch: Partial<Pick<BrattychartsBackground, 'name' | 'enabled' | 'selected' | 'order' | 'fit' | 'position' | 'overlayOpacity' | 'blurPx'>>) {
    await setDoc(doc(backgroundsReference(), id), { ...patch, updatedAt: new Date().toISOString() }, { merge: true })
  },
  async deleteBackground(item: BrattychartsBackground, token: string) {
    if (!firestore || !isBrattychartsMediaConfigured) throw new Error('El almacenamiento de Brattycharts no está configurado.')
    await runTransaction(firestore, async (transaction) => {
      const settingsSnapshot = await transaction.get(settingsReference())
      const settings = normalizeSettings(settingsSnapshot.exists() ? settingsSnapshot.data() : {})
      transaction.delete(doc(backgroundsReference(), item.id))
      transaction.set(settingsReference(), { ...settings, backgroundIds: settings.backgroundIds.filter((id) => id !== item.id), updatedAt: new Date().toISOString() })
    })
    await brattychartsMediaRequest(`/v1/media/${encodeURIComponent(item.storagePath).replace('%2F', '/')}`, token, { method: 'DELETE' })
  },
  async saveSlideshow(settings: BrattychartsAppearanceSettings, patch: Pick<BrattychartsAppearanceSettings, 'slideshowIntervalMs' | 'transitionMs'>) {
    await setDoc(settingsReference(), { ...patch, backgroundIds: settings.backgroundIds, videoEnabled: settings.videoEnabled, updatedAt: new Date().toISOString() }, { merge: true })
  },
  async uploadVideo(file: File, token: string) {
    if (!isBrattychartsMediaConfigured) throw new Error('El almacenamiento de Brattycharts no está configurado.')
    if (!['video/mp4', 'video/quicktime', 'video/webm'].includes(file.type) || file.size > MAX_VIDEO_BYTES) throw new Error('Usa MP4, MOV o WebM de máximo 100 MB.')
    const duration = await videoDuration(file)
    if (!Number.isFinite(duration) || duration > MAX_VIDEO_SECONDS) throw new Error('El video no puede durar más de 5 minutos.')
    const upload = await brattychartsMediaRequest('/v1/video', token, { method: 'POST', headers: { 'Content-Type': file.type }, body: file })
    const stored = await upload.json() as { objectKey: string; readUrl: string }
    await setDoc(settingsReference(), { ...defaultBrattychartsAppearanceSettings, videoEnabled: true, videoUrl: stored.readUrl, videoStoragePath: stored.objectKey, videoOriginalName: file.name.slice(0, 180), videoContentType: file.type, videoDurationSeconds: duration, updatedAt: new Date().toISOString() }, { merge: true })
  },
  async setVideoEnabled(enabled: boolean) { await setDoc(settingsReference(), { videoEnabled: enabled, updatedAt: new Date().toISOString() }, { merge: true }) },
  async deleteVideo(token: string) {
    if (!isBrattychartsMediaConfigured) throw new Error('El almacenamiento de Brattycharts no está configurado.')
    await brattychartsMediaRequest('/v1/media/video/current', token, { method: 'DELETE' })
    await updateDoc(settingsReference(), { videoEnabled: false, videoUrl: deleteField(), videoStoragePath: deleteField(), videoOriginalName: deleteField(), videoContentType: deleteField(), videoDurationSeconds: deleteField(), updatedAt: new Date().toISOString() })
  },
}
