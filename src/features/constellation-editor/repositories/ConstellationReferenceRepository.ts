import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { firebaseStorage, isFirebaseConfigured } from '../../../infrastructure/firebase/client'

const referencePath = 'constellation/reference-image'

export const constellationReferenceRepository = {
  usesFirebase: isFirebaseConfigured,
  async upload(file: File) {
    if (!firebaseStorage) throw new Error('Firebase no está configurado.')
    const target = ref(firebaseStorage, referencePath)
    await uploadBytes(target, file, { contentType: file.type || 'image/*', cacheControl: 'public,max-age=3600' })
    return getDownloadURL(target)
  },
}
