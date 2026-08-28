import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { firebaseAuth, firestore, googleProvider, isFirebaseConfigured } from '../../infrastructure/firebase/client'

export function useGoogleSession() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(Boolean(firebaseAuth))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!firebaseAuth) { setIsLoading(false); return }
    return onAuthStateChanged(firebaseAuth, async (currentUser) => {
      setUser(currentUser); setIsAdmin(false); setIsLoading(false)
      if (!currentUser || !firestore) return
      try {
        const admin = await getDoc(doc(firestore, 'admins', currentUser.uid))
        setIsAdmin(admin.exists() && admin.data().role === 'admin')
        // El registro propio de la experiencia contiene sólo el nombre visible y marcas de sesión.
        await setDoc(doc(firestore, 'participantSessions', currentUser.uid), { displayName: currentUser.displayName ?? 'Participante', lastSignInAt: serverTimestamp() }, { merge: true })
      } catch { /* Las reglas pueden restringir este registro sin impedir el acceso al sitio. */ }
    })
  }, [])

  const signIn = async () => {
    if (!firebaseAuth) { setError('El acceso con Google aún no está configurado en este entorno.'); return }
    try { setError(null); await signInWithPopup(firebaseAuth, googleProvider) }
    catch { setError('No fue posible iniciar sesión con Google.') }
  }
  const signOutUser = async () => { if (firebaseAuth) await signOut(firebaseAuth) }
  return { isConfigured: isFirebaseConfigured, user, isAdmin, isLoading, error, signIn, signOut: signOutUser }
}
