import { useCallback, useEffect, useState } from 'react'
import type { ElementReactions } from '../repositories/ElementReactionRepository'
import { elementReactionRepository } from '../repositories'

export function useElementReactions() {
  const [reactions, setReactions] = useState<ElementReactions>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => elementReactionRepository.subscribe(setReactions, () => setError('No fue posible actualizar las reacciones.')), [])
  const toggle = useCallback(async (elementId: string, userId: string) => {
    try { await elementReactionRepository.toggle(elementId, userId); setError(null) }
    catch { setError('No fue posible guardar tu reacción.') }
  }, [])

  return { reactions, error, toggle }
}
