import { collection, onSnapshot, orderBy, query, serverTimestamp, setDoc, doc, type Timestamp } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { firestore, isFirebaseConfigured } from '../../infrastructure/firebase/client'
import { userRoleLabels, userRoleValues, type UserRole } from './roles'

type ManagedUser = {
  uid: string
  role: UserRole
  displayName: string
  email?: string
  lastSignInAt?: Timestamp
}

const readDate = (value: Timestamp | undefined) => value ? value.toDate().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Sin registro'

export function UserRoleManager({ adminUid }: { adminUid: string }) {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!firestore || !isFirebaseConfigured) return
    return onSnapshot(query(collection(firestore, 'userRoles'), orderBy('lastSignInAt', 'desc')), (snapshot) => {
      setUsers(snapshot.docs.map((entry) => ({ uid: entry.id, role: (entry.data().role ?? 'USER') as UserRole, displayName: entry.data().displayName ?? 'Usuario sin nombre', email: entry.data().email, lastSignInAt: entry.data().lastSignInAt })))
    }, () => setMessage('No fue posible leer los roles. Revisa las reglas de Firestore.'))
  }, [])

  const changeRole = async (user: ManagedUser, role: UserRole) => {
    if (!firestore || user.uid === adminUid) return
    try {
      await setDoc(doc(firestore, 'userRoles', user.uid), { role, updatedAt: serverTimestamp() }, { merge: true })
      setMessage(`${user.displayName} ahora es ${userRoleLabels[role]}.`)
    } catch {
      setMessage('No fue posible actualizar el rol. Publica las reglas de Firestore incluidas en este cambio.')
    }
  }

  return <section className="role-manager" aria-label="Gestor de usuarios y permisos">
    <header><div><p>SEGURIDAD · USUARIOS</p><h2>Roles y accesos</h2></div><span>{users.length} registrados</span></header>
    <p>Las cuentas aparecen aquí después de acceder con Google. Tu cuenta administradora no se puede degradar desde la web.</p>
    <div className="role-guide">{userRoleValues.map((role) => <span key={role}><b>{userRoleLabels[role]}</b>{role === 'CONSTELLATION_CONTRIBUTOR' ? ' · sólo taller de constelación' : role === 'SPECIAL' ? ' · reservado para contenido especial' : role === 'GUEST' ? ' · aportación sin Google' : ''}</span>)}</div>
    {!isFirebaseConfigured ? <p className="role-status">Firebase no está configurado en este entorno.</p> : users.length ? <div className="role-user-list">{users.map((user) => <article key={user.uid}>
      <div><strong>{user.displayName}</strong><small>{user.email ?? `ID: ${user.uid.slice(0, 10)}…`} · {readDate(user.lastSignInAt)}</small></div>
      {user.uid === adminUid ? <b className="role-fixed">Administrador principal</b> : <label>Rol<select value={user.role} onChange={(event) => void changeRole(user, event.target.value as UserRole)}>{userRoleValues.map((role) => <option key={role} value={role}>{userRoleLabels[role]}</option>)}</select></label>}
    </article>)}</div> : <p className="role-status">Aún no hay cuentas registradas. Cuando alguien entre con Google aparecerá en esta lista.</p>}
    {message && <p className="role-status" role="status">{message}</p>}
    <a className="role-workshop-link" href="/taller-constelacion">Abrir enlace del taller aislado →</a>
  </section>
}
