import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { BrattychartsBackground } from '../domain/appearance'
import { useBrattychartsAppearance } from '../hooks/useBrattychartsAppearance'

const layerStyle = (item: BrattychartsBackground, transitionMs: number): CSSProperties => ({
  backgroundImage: `url("${item.imageUrl.replace(/["\\]/g, '')}")`,
  backgroundPosition: item.position,
  backgroundRepeat: item.fit === 'repeat' ? 'repeat' : 'no-repeat',
  backgroundSize: item.fit === 'repeat' ? 'auto' : item.fit === 'contain' ? 'contain' : 'cover',
  filter: item.blurPx ? `blur(${item.blurPx}px)` : undefined,
  transform: item.blurPx ? 'scale(1.04)' : undefined,
  animationDuration: `${transitionMs}ms`,
})

export function BrattychartsBackdrop() {
  const { settings, backgrounds } = useBrattychartsAppearance()
  const selected = useMemo(() => backgrounds.filter((item) => item.enabled && item.selected).sort((left, right) => left.order - right.order), [backgrounds])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [previousId, setPreviousId] = useState<string | null>(null)
  const [failedIds, setFailedIds] = useState<Set<string>>(() => new Set())
  const [readyVideoUrl, setReadyVideoUrl] = useState<string | null>(null)
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const available = useMemo(() => selected.filter((item) => !failedIds.has(item.id)), [failedIds, selected])
  const current = available.find((item) => item.id === currentId) ?? available[0]
  const previous = selected.find((item) => item.id === previousId)

  useEffect(() => {
    if (!current) return
    const preload = new Image()
    preload.onerror = () => setFailedIds((ids) => new Set(ids).add(current.id))
    preload.src = current.imageUrl
  }, [current])

  useEffect(() => {
    if (available.length < 2 || !current || reducedMotion) return
    const timer = window.setTimeout(() => {
      const currentIndex = available.findIndex((item) => item.id === current.id)
      const next = available[(currentIndex + 1) % available.length]
      const preload = new Image()
      preload.onload = () => { setPreviousId(current.id); setCurrentId(next.id); window.setTimeout(() => setPreviousId(null), settings.transitionMs + 80) }
      preload.onerror = () => setFailedIds((ids) => new Set(ids).add(next.id))
      preload.src = next.imageUrl
    }, settings.slideshowIntervalMs)
    return () => window.clearTimeout(timer)
  }, [available, current, reducedMotion, settings.slideshowIntervalMs, settings.transitionMs])

  return <div className="brattycharts-backdrop" aria-hidden="true">
    <div className="brattycharts-backdrop__fallback" />
    {previous && <div className="brattycharts-backdrop__layer is-previous" style={layerStyle(previous, settings.transitionMs)}><span style={{ opacity: previous.overlayOpacity }} /></div>}
    {current && <div className="brattycharts-backdrop__layer is-current" style={layerStyle(current, settings.transitionMs)}><span style={{ opacity: current.overlayOpacity }} /></div>}
    {settings.videoEnabled && settings.videoUrl && <video key={settings.videoUrl} className={`brattycharts-backdrop__video${readyVideoUrl === settings.videoUrl ? ' is-ready' : ''}`} src={settings.videoUrl} autoPlay muted playsInline loop onCanPlay={() => setReadyVideoUrl(settings.videoUrl ?? null)} onError={() => setReadyVideoUrl(null)} />}
    <div className="brattycharts-backdrop__shade" />
  </div>
}
