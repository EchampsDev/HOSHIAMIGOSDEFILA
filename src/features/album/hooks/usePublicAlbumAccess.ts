import { useCallback, useEffect, useMemo, useState } from 'react'
import { experienceLaunch } from '../../landing/data/experienceLaunch'
import { albumAccessRepository } from '../repositories/AlbumAccessRepository'

const LOCAL_KEY = 'brattypolitan.album-access.v1'
const readLocal = () => {
  try { return Boolean(JSON.parse(window.localStorage.getItem(LOCAL_KEY) ?? '{}').isUnlocked) } catch { return false }
}

export function usePublicAlbumAccess() {
  const [manualUnlocked, setManualUnlocked] = useState(readLocal)
  const [now, setNow] = useState(() => Date.now())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => albumAccessRepository.subscribe((settings) => {
    setManualUnlocked(settings.isUnlocked)
    setError(null)
  }, () => setError('No fue posible sincronizar el acceso a la libreta.')), [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [])

  const eventEnded = now >= new Date(experienceLaunch.targetDate).getTime()
  const isUnlocked = manualUnlocked || eventEnded
  const setUnlocked = useCallback(async (next: boolean) => {
    if (albumAccessRepository.usesFirebase) await albumAccessRepository.save({ isUnlocked: next })
    else {
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify({ isUnlocked: next }))
      setManualUnlocked(next)
    }
  }, [])

  return useMemo(() => ({ isUnlocked, manualUnlocked, eventEnded, error, setUnlocked }), [error, eventEnded, isUnlocked, manualUnlocked, setUnlocked])
}
