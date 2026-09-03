import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { firestore, isFirebaseConfigured } from '../../../infrastructure/firebase/client'
import { defaultBrattyExperienceSettings, type BrattyExperienceSettings, type BrattyVideoSubmission } from '../domain/types'

const settingsReference = () => {
  if (!firestore) throw new Error('Firebase no está configurado.')
  return doc(firestore, 'siteConfig', 'brattyExperience')
}
const submissionReference = () => {
  if (!firestore) throw new Error('Firebase no está configurado.')
  return doc(firestore, 'brattySubmissions', 'current')
}

const normalizeSettings = (value: Partial<BrattyExperienceSettings>): BrattyExperienceSettings => ({
  invitationActive: Boolean(value.invitationActive),
  surpriseActive: Boolean(value.surpriseActive),
})

const normalizeSubmission = (value: Partial<BrattyVideoSubmission>): BrattyVideoSubmission | null => {
  if (!value.videoUrl || !value.storagePath) return null
  return {
    authorName: value.authorName ?? 'Bratty',
    message: value.message ?? '',
    videoUrl: value.videoUrl,
    storagePath: value.storagePath,
    originalName: value.originalName ?? 'video',
    contentType: value.contentType ?? 'video/mp4',
    uploadedAt: value.uploadedAt ?? new Date().toISOString(),
  }
}

export const brattyExperienceRepository = {
  usesFirebase: isFirebaseConfigured,
  subscribeSettings(listener: (value: BrattyExperienceSettings) => void, onError: (error: unknown) => void) {
    if (!isFirebaseConfigured) return undefined
    return onSnapshot(settingsReference(), (snapshot) => listener(normalizeSettings(snapshot.exists() ? snapshot.data() : defaultBrattyExperienceSettings)), onError)
  },
  subscribeSubmission(listener: (value: BrattyVideoSubmission | null) => void, onError: (error: unknown) => void) {
    if (!isFirebaseConfigured) return undefined
    return onSnapshot(submissionReference(), (snapshot) => listener(snapshot.exists() ? normalizeSubmission(snapshot.data()) : null), onError)
  },
  async saveSettings(value: BrattyExperienceSettings) {
    await setDoc(settingsReference(), value, { merge: true })
  },
  async saveSubmission(value: BrattyVideoSubmission) {
    await setDoc(submissionReference(), value)
  },
}
