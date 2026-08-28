import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Auth and Firestore can initialize with the core web configuration. `appId` is
// useful for other Firebase products, but GitHub deployments should not fall
// back to the static constellation merely because that optional value is absent.
export const isFirebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId)
const app: FirebaseApp | null = isFirebaseConfigured ? (getApps().length ? getApp() : initializeApp(config)) : null

export const firebaseAuth: Auth | null = app ? getAuth(app) : null
export const firestore: Firestore | null = app ? getFirestore(app) : null
export const firebaseStorage: FirebaseStorage | null = app ? getStorage(app) : null
export const googleProvider = new GoogleAuthProvider()
