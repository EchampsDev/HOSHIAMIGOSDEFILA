import { backgroundStars, constellationConnections, constellationPoints } from '../data/constellationData'
import { useConstellationAnimation } from '../hooks/useConstellationAnimation'
import { FourPointStar } from './FourPointStar'

const easeOut = (value: number) => 1 - (1 - value) ** 3
const pointProgress = (progress: number, delay = 0) => Math.min(Math.max((progress * 2500 - delay) / 750, 0), 1)
const startPosition = (index: number) => ({ x: 12 + ((index * 31) % 76), y: 5 + ((index * 47) % 91) })

export function ConstellationHero() {
  const { progress, stage } = useConstellationAnimation()
  const positions = new Map(constellationPoints.map((point, index) => { const start = startPosition(index); const movement = easeOut(pointProgress(progress, point.delay)); return [point.id, { x: start.x + (point.x - start.x) * movement, y: start.y + (point.y - start.y) * movement, opacity: .18 + movement * .82 }] }))
  return <div className="constellation-hero" aria-hidden="true"><svg viewBox="0 0 100 105" preserveAspectRatio="xMidYMid meet">
    <g className="ambient-stars">{backgroundStars.map((star, index) => <circle key={index} cx={star.x} cy={star.y} r={star.s / 2} />)}</g>
    <g className="constellation-lines">{constellationConnections.map((connection) => { const from = positions.get(connection.from); const to = positions.get(connection.to); if (!from || !to) return null; const visibility = pointProgress(progress, connection.delay); return <line key={`${connection.from}-${connection.to}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} style={{ opacity: visibility * (connection.opacity ?? .35) }} /> })}</g>
    <g className="constellation-points">{constellationPoints.map((point) => { const position = positions.get(point.id); return position ? <circle key={point.id} cx={position.x} cy={position.y} r={point.size / 2} className={`point-${point.group}`} style={{ opacity: position.opacity }} /> : null })}</g>
    <FourPointStar active={stage !== 'FORMING'} />
  </svg></div>
}
