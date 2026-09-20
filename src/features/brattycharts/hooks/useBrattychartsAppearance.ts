import { useEffect, useState } from 'react'
import { defaultBrattychartsAppearanceSettings, type BrattychartsAppearance } from '../domain/appearance'
import { brattychartsAppearanceRepository } from '../repositories/BrattychartsAppearanceRepository'

const initialAppearance: BrattychartsAppearance = { settings: defaultBrattychartsAppearanceSettings, backgrounds: [] }

export function useBrattychartsAppearance() {
  const [appearance, setAppearance] = useState(initialAppearance)
  const [loading, setLoading] = useState(brattychartsAppearanceRepository.usesFirebase)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => brattychartsAppearanceRepository.subscribe((value) => { setAppearance(value); setLoading(false) }, () => { setError('No fue posible cargar la apariencia. Se mostrará el fondo de ladrillos.'); setLoading(false) }), [])
  return { ...appearance, loading, error }
}

