type AmbientStar = { x: number; y: number; size: number; variant: 'crisp' | 'glow' | 'soft'; delay: number }

function createStarfield() {
  let seed = 240918
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  const stars: AmbientStar[] = []
  while (stars.length < 220) {
    const x = random() * 100
    const y = random() * 100
    // Separación mínima: distribuye las estrellas sin filas ni agrupaciones rígidas.
    if (stars.some((star) => Math.hypot(star.x - x, star.y - y) < 1.5)) continue
    const index = stars.length
    stars.push({ x, y, size: .65 + random() * 1.55, variant: index % 11 === 0 ? 'soft' : index % 5 === 0 ? 'glow' : 'crisp', delay: -(random() * 5) })
  }
  return stars
}

const ambientStars = createStarfield()

export function StarfieldBackground() {
  return <div className="starfield" aria-hidden="true">
    {ambientStars.map((star, index) => <i
      className={`ambient-star ambient-star--${star.variant}`}
      key={index}
      style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.size, height: star.size, animationDelay: `${star.delay}s` }}
    />)}
  </div>
}
