import { useCallback, useEffect, useMemo, useState } from 'react'
import { readLocalParticipationSettings, writeLocalParticipationSettings } from '../data/localParticipation'
import { participationAccessRepository } from '../repositories/ParticipationAccessRepository'

export function useParticipationAccess() {
  const [isOpen, setIsOpen] = useState(() => readLocalParticipationSettings().isOpen)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => participationAccessRepository.subscribe((settings) => {
    setIsOpen(settings.isOpen)
    setError(null)
  }, () => setError('No fue posible sincronizar la apertura de participación.')), [])

  const setOpen = useCallback(async (next: boolean) => {
    if (participationAccessRepository.usesFirebase) await participationAccessRepository.save({ isOpen: next })
    else {
      writeLocalParticipationSettings({ isOpen: next })
      setIsOpen(next)
    }
  }, [])

  return useMemo(() => ({ isOpen, error, setOpen }), [error, isOpen, setOpen])
}
