import { useEffect, useState } from 'react'

export type ConstellationStage = 'IDLE' | 'FORMING' | 'REVEAL' | 'RESTING'

export function useConstellationAnimation(active = true) {
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [progress, setProgress] = useState(reducedMotion ? 1 : 0)
  const [stage, setStage] = useState<ConstellationStage>(reducedMotion ? 'RESTING' : 'IDLE')
  useEffect(() => {
    if (reducedMotion || !active) return

    let frame = 0
    const duration = 5200
    const idleDuration = 260
    const startedAt = performance.now()
    const tick = (now: number) => {
      const elapsed = now - startedAt
      const next = Math.min(Math.max((elapsed - idleDuration) / duration, 0), 1)
      setProgress(next)
      setStage(elapsed < idleDuration ? 'IDLE' : next < .93 ? 'FORMING' : next < 1 ? 'REVEAL' : 'RESTING')
      if (next < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active, reducedMotion])
  return { progress, stage }
}
