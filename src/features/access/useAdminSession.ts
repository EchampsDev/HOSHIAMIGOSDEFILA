import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { firebaseAuth, googleProvider, isFirebaseConfigured } from '../../infrastructure/firebase/client'

export function useAdminSession() {
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!firebaseAuth) return
    return onAuthStateChanged(firebaseAuth, setUser)
  }, [])

  const signIn = async () => {
    if (!firebaseAuth) { setError('Firebase aún no está configurado en este entorno.'); return }
    try { setError(null); await signInWithPopup(firebaseAuth, googleProvider) }
    catch { setError('No fue posible iniciar sesión con Google.') }
  }
  const signOutAdmin = async () => { if (firebaseAuth) await signOut(firebaseAuth) }
  return { isConfigured: isFirebaseConfigured, user, error, signIn, signOut: signOutAdmin }
}
