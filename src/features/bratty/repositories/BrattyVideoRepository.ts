import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'
import { firebaseStorage, isFirebaseConfigured } from '../../../infrastructure/firebase/client'

export const MAX_BRATTY_VIDEO_BYTES = 300 * 1024 * 1024
const allowedTypes = new Set(['video/mp4', 'video/quicktime', 'video/webm'])

export const brattyVideoRepository = {
  usesFirebase: isFirebaseConfigured,
  validate(file: File) {
    if (!allowedTypes.has(file.type)) throw new Error('Usa un video MP4, MOV o WebM.')
    if (file.size > MAX_BRATTY_VIDEO_BYTES) throw new Error('El video debe pesar máximo 300 MB.')
  },
  async upload(file: File, onProgress: (progress: number) => void) {
    this.validate(file)
    if (!firebaseStorage) throw new Error('Firebase Storage no está configurado.')
    const target = ref(firebaseStorage, 'bratty-surprise/current/video')
    const task = uploadBytesResumable(target, file, { contentType: file.type, cacheControl: 'public,max-age=3600' })
    await new Promise<void>((resolve, reject) => task.on('state_changed', (snapshot) => onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)), reject, resolve))
    return { videoUrl: await getDownloadURL(target), storagePath: target.fullPath }
  },
}
