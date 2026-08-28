import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { constellationConnections } from '../data/constellationConnections'
import { constellationPoints } from '../data/constellationPoints'
import { defaultConstellationScene, readConstellationScene, type ConstellationScene } from '../data/constellationScene'
import { useConstellationAnimation } from '../hooks/useConstellationAnimation'
import { FourPointStar } from './FourPointStar'
import { constellationRepository } from '../../constellation-editor/repositories/ConstellationRepository'

const clamp = (value: number) => Math.min(Math.max(value, 0), 1)
const easeInOutCubic = (value: number) => value < .5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2
const pointProgress = (progress: number, delay = 0) => easeInOutCubic(clamp((progress - delay) / .48))
const connectionProgress = (progress: number, delay = 0) => easeInOutCubic(clamp((progress - .66 - delay) / .22))

function seededValue(id: string, salt: number) {
  let hash = 2166136261 ^ salt
  for (const character of id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  return ((hash >>> 0) % 1_000_000) / 1_000_000
}

function seededPosition(id: string) {
  const angle = seededValue(id, 13) * Math.PI * 2
  const distance = .92 + seededValue(id, 47) * .82
  return { x: .5 + Math.cos(angle) * distance, y: .5 + Math.sin(angle) * distance }
}

const delayedPoint = (id: string, delay = 0) => Math.min(.4, .025 + seededValue(id, 91) * .29 + clamp(delay) * .22)
const delayedConnection = (id: string, delay = 0) => Math.min(.11, seededValue(id, 127) * .08 + clamp(delay) * .14)

export function ConstellationHero() {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hasEntered, setHasEntered] = useState(false)
  const [layoutVersion, setLayoutVersion] = useState(0)
  const [twinkleTime, setTwinkleTime] = useState(0)
  const [scene, setScene] = useState<ConstellationScene>(readConstellationScene)
  const [points, setPoints] = useState(constellationPoints)
  const [connections, setConnections] = useState(constellationConnections)
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | undefined>()
  const { progress, stage } = useConstellationAnimation(hasEntered)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      setHasEntered(true)
      observer.disconnect()
    }, { threshold: .18 })
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!hasEntered) return
    const timer = window.setInterval(() => setTwinkleTime(performance.now()), 150)
    return () => window.clearInterval(timer)
  }, [hasEntered])

  useEffect(() => {
    if (!constellationRepository.usesFirebase) return
    return constellationRepository.subscribe((progress) => {
      if (!progress) return
      setPoints(progress.points)
      setConnections(progress.connections)
      setScene({ ...defaultConstellationScene, ...progress.scene })
      setReferenceImageUrl(progress.referenceImageUrl)
    }, () => undefined)
  }, [])

  useEffect(() => {
    const syncScene = () => setScene(readConstellationScene())
    window.addEventListener('storage', syncScene)
    window.addEventListener('focus', syncScene)
    return () => {
      window.removeEventListener('storage', syncScene)
      window.removeEventListener('focus', syncScene)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => setLayoutVersion((version) => version + 1))
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const bounds = canvas.getBoundingClientRect()
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.max(Math.round(bounds.width * ratio), 1)
    const height = Math.max(Math.round(bounds.height * ratio), 1)
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    const context = canvas.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, width, height)

    const sceneWidth = Math.min(width * .88, height * .72)
    const sceneHeight = Math.min(height * .94, sceneWidth / .72)
    const offsetX = (width - sceneWidth) / 2
    const offsetY = (height - sceneHeight) / 2
    const positions = new Map<string, { x: number; y: number; alpha: number }>()

    // Polvo estelar muy tenue: une visualmente la constelación con el fondo,
    // sin competir con los puntos que definen la silueta.
    for (let index = 0; index < 68; index += 1) {
      const id = `dust-${index}`
      const pulse = .58 + Math.sin(twinkleTime / 900 + seededValue(id, 203) * Math.PI * 2) * .22
      const radius = (.22 + seededValue(id, 229) * .46) * ratio
      context.fillStyle = `rgba(179,230,255,${(.035 + seededValue(id, 251) * .055) * pulse})`
      context.beginPath()
      context.arc(seededValue(id, 277) * width, seededValue(id, 293) * height, radius, 0, Math.PI * 2)
      context.fill()
    }

    points.forEach((point) => {
      const start = seededPosition(point.id)
      const movement = pointProgress(progress, delayedPoint(point.id, point.delay))
      positions.set(point.id, {
        x: offsetX + (start.x + (point.x - start.x) * movement) * sceneWidth,
        y: offsetY + (start.y + (point.y - start.y) * movement) * sceneHeight,
        alpha: movement ** .72,
      })
    })

    context.lineCap = 'round'
    connections.forEach((connection) => {
      const from = positions.get(connection.from)
      const to = positions.get(connection.to)
      if (!from || !to) return
      const reveal = connectionProgress(progress, delayedConnection(`${connection.from}-${connection.to}`, connection.delay))
      context.beginPath()
      context.moveTo(from.x, from.y)
      context.lineTo(from.x + (to.x - from.x) * reveal, from.y + (to.y - from.y) * reveal)
      const twinkle = .78 + Math.sin(twinkleTime / 760 + seededValue(`${connection.from}-${connection.to}`, 313) * Math.PI * 2) * .12
      context.strokeStyle = `rgba(159,229,255,${reveal * (connection.opacity ?? .28) * twinkle * .76})`
      context.lineWidth = Math.max(.65 * ratio, .7)
      context.stroke()
    })

    points.forEach((point) => {
      const position = positions.get(point.id)
      if (!position) return
      const radius = point.size * ratio
      const glow = radius * 1.55
      const twinkle = .79 + Math.sin(twinkleTime / (430 + seededValue(point.id, 347) * 560) + seededValue(point.id, 373) * Math.PI * 2) * .17
      const gradient = context.createRadialGradient(position.x, position.y, 0, position.x, position.y, glow)
      gradient.addColorStop(0, `rgba(215,249,255,${position.alpha * (point.brightness ?? .98) * twinkle * .84})`)
      gradient.addColorStop(.26, `rgba(54,204,255,${position.alpha * .48 * twinkle * .76})`)
      gradient.addColorStop(.62, `rgba(24,147,255,${position.alpha * .08 * twinkle})`)
      gradient.addColorStop(1, 'rgba(24,147,255,0)')
      context.fillStyle = gradient
      context.beginPath()
      context.arc(position.x, position.y, glow, 0, Math.PI * 2)
      context.fill()
      context.fillStyle = `rgba(244,253,255,${Math.min(position.alpha * twinkle * .92, 1)})`
      context.beginPath()
      context.arc(position.x, position.y, Math.max(radius * .58, .9), 0, Math.PI * 2)
      context.fill()
    })
  }, [connections, layoutVersion, points, progress, twinkleTime])

  return <div ref={hostRef} className={`constellation-hero is-${stage.toLowerCase()}`} aria-hidden="true">
    {referenceImageUrl && <div className="constellation-reference-layer" style={{ '--reference-x': `${scene.referenceX}%`, '--reference-y': `${scene.referenceY}%` } as CSSProperties}><img src={referenceImageUrl} alt="" /></div>}
    <canvas ref={canvasRef} />
    <FourPointStar active={stage === 'REVEAL' || stage === 'RESTING'} scene={scene} />
  </div>
}
