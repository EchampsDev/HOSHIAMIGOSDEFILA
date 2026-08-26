import { useEffect, useRef, useState } from 'react'
import { constellationConnections } from '../data/constellationConnections'
import { constellationPoints } from '../data/constellationPoints'
import { useConstellationAnimation } from '../hooks/useConstellationAnimation'
import { FourPointStar } from './FourPointStar'

const clamp = (value: number) => Math.min(Math.max(value, 0), 1)
const easeInOutCubic = (value: number) => value < .5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2
const pointProgress = (progress: number, delay = 0) => easeInOutCubic(clamp((progress - delay) / .57))
const connectionProgress = (progress: number, delay = 0) => easeInOutCubic(clamp((progress - .55 - delay) / .19))

function seededPosition(id: string) {
  const seed = [...id].reduce((total, character) => total + character.charCodeAt(0) * 17, 0)
  const edge = seed % 4
  const offset = ((seed * 47) % 1000) / 1000
  if (edge === 0) return { x: -.08, y: offset }
  if (edge === 1) return { x: 1.08, y: offset }
  if (edge === 2) return { x: offset, y: -.08 }
  return { x: offset, y: 1.08 }
}

export function ConstellationHero() {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hasEntered, setHasEntered] = useState(false)
  const [layoutVersion, setLayoutVersion] = useState(0)
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

    constellationPoints.forEach((point) => {
      const start = seededPosition(point.id)
      const movement = pointProgress(progress, point.delay)
      positions.set(point.id, {
        x: offsetX + (start.x + (point.x - start.x) * movement) * sceneWidth,
        y: offsetY + (start.y + (point.y - start.y) * movement) * sceneHeight,
        alpha: .12 + movement * .88,
      })
    })

    context.lineCap = 'round'
    constellationConnections.forEach((connection) => {
      const from = positions.get(connection.from)
      const to = positions.get(connection.to)
      if (!from || !to) return
      const reveal = connectionProgress(progress, connection.delay)
      context.beginPath()
      context.moveTo(from.x, from.y)
      context.lineTo(from.x + (to.x - from.x) * reveal, from.y + (to.y - from.y) * reveal)
      context.strokeStyle = `rgba(159,229,255,${reveal * (connection.opacity ?? .28)})`
      context.lineWidth = Math.max(.65 * ratio, .7)
      context.stroke()
    })

    constellationPoints.forEach((point) => {
      const position = positions.get(point.id)
      if (!position) return
      const radius = point.size * ratio
      const glow = radius * 2.25
      const gradient = context.createRadialGradient(position.x, position.y, 0, position.x, position.y, glow)
      gradient.addColorStop(0, `rgba(215,249,255,${position.alpha * (point.brightness ?? .98)})`)
      gradient.addColorStop(.26, `rgba(54,204,255,${position.alpha * .62})`)
      gradient.addColorStop(.62, `rgba(24,147,255,${position.alpha * .15})`)
      gradient.addColorStop(1, 'rgba(24,147,255,0)')
      context.fillStyle = gradient
      context.beginPath()
      context.arc(position.x, position.y, glow, 0, Math.PI * 2)
      context.fill()
      context.fillStyle = `rgba(244,253,255,${Math.min(position.alpha * 1.08, 1)})`
      context.beginPath()
      context.arc(position.x, position.y, Math.max(radius * .58, .9), 0, Math.PI * 2)
      context.fill()
    })
  }, [layoutVersion, progress])

  return <div ref={hostRef} className={`constellation-hero is-${stage.toLowerCase()}`} aria-hidden="true">
    <canvas ref={canvasRef} />
    <FourPointStar active={stage === 'REVEAL' || stage === 'RESTING'} />
  </div>
}
