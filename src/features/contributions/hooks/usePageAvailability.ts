import { useEffect, useState } from 'react'
import { contributionRepository } from '../repositories'
import type { PendingPageCounts } from '../repositories/ContributionRepository'

export function usePageAvailability() {
  const [pending, setPending] = useState<PendingPageCounts>({})
  const [error, setError] = useState(false)
  useEffect(() => contributionRepository.subscribeAvailability(setPending, () => setError(true)), [])
  return { pending, error }
}
