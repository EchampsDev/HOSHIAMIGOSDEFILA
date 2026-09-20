import { collection, doc, limit, onSnapshot, orderBy, query, setDoc, updateDoc } from 'firebase/firestore'
import { useEffect, useMemo, useState } from 'react'
import { firestore } from '../../../infrastructure/firebase/client'

export type RegistrationNotification = {
  id: string
  uid: string
  displayName: string
  email: string
  source: 'GENERAL' | 'BRATTY_INVITATION'
  createdAt: string
  read: boolean
  readAt?: string
  readBy?: string
}

export type ModerationEvent = {
  id: string
  targetId: string
  targetKind: 'CONTRIBUTION' | 'STICKER'
  contributionType: string
  action: 'APPROVED' | 'REJECTED' | 'DELETED'
  authorName: string
  pageNumber?: number
  moderatorUid: string
  moderatorName: string
  moderatorEmail: string
  createdAt: string
}

export type NewModerationEvent = Omit<ModerationEvent, 'id' | 'createdAt'>

const fromRegistration = (snapshot: { id: string; data(): unknown }): RegistrationNotification => ({ id: snapshot.id, ...(snapshot.data() as Omit<RegistrationNotification, 'id'>) })
const fromModeration = (snapshot: { id: string; data(): unknown }): ModerationEvent => ({ id: snapshot.id, ...(snapshot.data() as Omit<ModerationEvent, 'id'>) })

export async function recordModerationEvent(input: NewModerationEvent) {
  if (!firestore) return
  const id = crypto.randomUUID()
  await setDoc(doc(firestore, 'moderationEvents', id), { ...input, id, createdAt: new Date().toISOString() })
}

export function useAdminActivity(enabled: boolean) {
  const [notifications, setNotifications] = useState<RegistrationNotification[]>([])
  const [moderations, setModerations] = useState<ModerationEvent[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !firestore) return
    const stopRegistrations = onSnapshot(
      query(collection(firestore, 'registrationNotifications'), orderBy('createdAt', 'desc'), limit(20)),
      (snapshot) => { setNotifications(snapshot.docs.map(fromRegistration)); setError(null) },
      () => setError('No fue posible consultar las notificaciones de registro.'),
    )
    const stopModerations = onSnapshot(
      query(collection(firestore, 'moderationEvents'), orderBy('createdAt', 'desc'), limit(20)),
      (snapshot) => { setModerations(snapshot.docs.map(fromModeration)); setError(null) },
      () => setError('No fue posible consultar el historial de moderación.'),
    )
    return () => { stopRegistrations(); stopModerations() }
  }, [enabled])

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications])
  const markRead = async (item: RegistrationNotification, adminUid: string) => {
    if (!firestore || item.read || !adminUid) return
    await updateDoc(doc(firestore, 'registrationNotifications', item.id), { read: true, readAt: new Date().toISOString(), readBy: adminUid })
  }

  return { notifications, moderations, unreadCount, error, markRead }
}
