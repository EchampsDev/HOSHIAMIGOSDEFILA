import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { firebaseAuth, firestore, googleProvider, isFirebaseConfigured } from '../../infrastructure/firebase/client'
import { isAdministrator, type UserRole } from './roles'

export function useGoogleSession() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [role, setRole] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(firebaseAuth))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!firebaseAuth) return
    let stopRoleUpdates: (() => void) | undefined
    const stopAuthUpdates = onAuthStateChanged(firebaseAuth, async (currentUser: User | null) => {
      stopRoleUpdates?.()
      stopRoleUpdates = undefined
      setUser(currentUser); setIsAdmin(false); setRole(null); setError(null)
      if (!currentUser || !firestore) { setIsLoading(false); return }
      setIsLoading(true)
      try {
        const adminReference = doc(firestore, 'admins', currentUser.uid)
        const roleReference = doc(firestore, 'userRoles', currentUser.uid)
        const [admin, profile] = await Promise.all([getDoc(adminReference), getDoc(roleReference)])
        const legacyAdmin = admin.exists()
        const applyRole = (nextRole: UserRole) => {
          setRole(nextRole)
          setIsAdmin(legacyAdmin || isAdministrator(nextRole))
        }
        applyRole((profile.data()?.role as UserRole | undefined) ?? 'USER')
        stopRoleUpdates = onSnapshot(roleReference, (snapshot) => {
          applyRole((snapshot.data()?.role as UserRole | undefined) ?? 'USER')
        })
        const identity = { displayName: currentUser.displayName ?? 'Participante', email: currentUser.email ?? '', lastSignInAt: serverTimestamp() }
        if (profile.exists()) await updateDoc(roleReference, identity)
        else await setDoc(roleReference, { ...identity, role: 'USER', createdAt: serverTimestamp() })
        // El registro propio de la experiencia contiene sólo el nombre visible y marcas de sesión.
        await setDoc(doc(firestore, 'participantSessions', currentUser.uid), { displayName: currentUser.displayName ?? 'Participante', lastSignInAt: serverTimestamp() }, { merge: true })
      } catch (cause) {
        const code = typeof cause === 'object' && cause && 'code' in cause ? String(cause.code) : 'unknown'
        setError(`Tu cuenta inició sesión, pero no pudo registrarse para los permisos (${code}). Revisa las reglas de Firestore publicadas.`)
      } finally {
        setIsLoading(false)
      }
    })
    return () => { stopRoleUpdates?.(); stopAuthUpdates() }
  }, [])

  const signIn = async () => {
    if (!firebaseAuth) { setError('El acceso con Google aún no está configurado en este entorno.'); return }
    try { setError(null); await signInWithPopup(firebaseAuth, googleProvider) }
    catch { setError('No fue posible iniciar sesión con Google.') }
  }
  const signOutUser = async () => { if (firebaseAuth) await signOut(firebaseAuth) }
  return { isConfigured: isFirebaseConfigured, user, isAdmin, role, isLoading, error, signIn, signOut: signOutUser }
}
