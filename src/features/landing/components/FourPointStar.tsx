import type { CSSProperties } from 'react'
import type { ConstellationScene } from '../data/constellationScene'

type FourPointStarProps = { active: boolean; scene: ConstellationScene }

export function FourPointStar({ active, scene }: FourPointStarProps) {
  const style = { '--star-x': `${scene.starX}%`, '--star-y': `${scene.starY}%`, '--star-scale': scene.starScale, '--star-intensity': scene.starIntensity } as CSSProperties
  return <span className={`four-point-star${active ? ' is-active' : ''}`} style={style}>
    <span className="four-point-star__core" />
  </span>
}
