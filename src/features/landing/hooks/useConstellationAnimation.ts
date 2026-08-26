import { useEffect, useState } from 'react'

export type ConstellationStage = 'FORMING' | 'REVEAL' | 'RESTING'

export function useConstellationAnimation() {
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState<ConstellationStage>('FORMING')
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setProgress(1); setStage('RESTING'); return }
    let frame = 0; const startedAt = performance.now(); const duration = 2300
    const tick = (now: number) => { const next = Math.min((now - startedAt) / duration, 1); setProgress(1 - (1 - next) ** 3); setStage(next < .68 ? 'FORMING' : next < 1 ? 'REVEAL' : 'RESTING'); if (next < 1) frame = requestAnimationFrame(tick) }
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame)
  }, [])
  return { progress, stage }
}
