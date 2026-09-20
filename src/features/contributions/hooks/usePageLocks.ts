import { collection, doc, onSnapshot, writeBatch } from 'firebase/firestore'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { firestore } from '../../../infrastructure/firebase/client'

export type PageLock = {
  pageNumber: number
  reserved: true
  reservedAt: string
  reservedBy: string
}

const LOCAL_KEY = 'brattypolitan.page-locks'
const LOCAL_EVENT = 'brattypolitan-page-locks-change'

const readLocal = (): Record<number, PageLock> => {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}') as Record<number, PageLock> }
  catch { return {} }
}

export function usePageLocks() {
  const [locks, setLocks] = useState<Record<number, PageLock>>({})
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (firestore) return onSnapshot(collection(firestore, 'pageLocks'), (snapshot) => {
      const next: Record<number, PageLock> = {}
      for (const item of snapshot.docs) {
        const value = item.data() as PageLock
        const pageNumber = Number(item.id)
        if (Number.isInteger(pageNumber) && pageNumber >= 1 && pageNumber <= 100 && value.reserved === true) next[pageNumber] = { ...value, pageNumber }
      }
      setLocks(next)
      setError(null)
    }, () => setError('No fue posible consultar las caras reservadas.'))

    const sync = () => setLocks(readLocal())
    sync()
    window.addEventListener(LOCAL_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener(LOCAL_EVENT, sync); window.removeEventListener('storage', sync) }
  }, [])

  const reservedPages = useMemo(() => new Set(Object.keys(locks).map(Number)), [locks])

  const setReserved = useCallback(async (pageNumbers: number[], reserved: boolean, adminUid: string) => {
    const valid = [...new Set(pageNumbers)].filter((page) => Number.isInteger(page) && page >= 1 && page <= 100)
    if (!valid.length || !adminUid) return
    setIsSaving(true)
    setError(null)
    try {
      const now = new Date().toISOString()
      if (firestore) {
        const batch = writeBatch(firestore)
        for (const pageNumber of valid) {
          const reference = doc(firestore, 'pageLocks', String(pageNumber))
          if (reserved) batch.set(reference, { pageNumber, reserved: true, reservedAt: now, reservedBy: adminUid })
          else batch.delete(reference)
        }
        await batch.commit()
      } else {
        const next = readLocal()
        for (const pageNumber of valid) {
          if (reserved) next[pageNumber] = { pageNumber, reserved: true, reservedAt: now, reservedBy: adminUid }
          else delete next[pageNumber]
        }
        localStorage.setItem(LOCAL_KEY, JSON.stringify(next))
        window.dispatchEvent(new Event(LOCAL_EVENT))
      }
    } catch {
      setError('No fue posible actualizar las reservas. Intenta nuevamente.')
      throw new Error('No fue posible actualizar las reservas.')
    } finally {
      setIsSaving(false)
    }
  }, [])

  return { locks, reservedPages, error, isSaving, setReserved }
}
