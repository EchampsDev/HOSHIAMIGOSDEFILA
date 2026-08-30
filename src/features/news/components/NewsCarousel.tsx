import { useRef, useState } from 'react'
import type { NewsImage } from '../domain/types'

export function NewsCarousel({ images, fallbackAlt }: { images: NewsImage[]; fallbackAlt: string }) {
  const ordered = [...images].sort((a, b) => a.order - b.order)
  const [index, setIndex] = useState(0)
  const touchStart = useRef<number | null>(null)
  if (!ordered.length) return <div className="news-image-placeholder" aria-label="Noticia sin imagen"><span>✦</span></div>
  const currentIndex = Math.min(index, ordered.length - 1)
  const go = (next: number) => setIndex((next + ordered.length) % ordered.length)
  return <div className="news-carousel" onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null }} onTouchEnd={(event) => { if (touchStart.current == null) return; const delta = event.changedTouches[0].clientX - touchStart.current; if (Math.abs(delta) > 45) go(currentIndex + (delta < 0 ? 1 : -1)); touchStart.current = null }}>
    <img src={ordered[currentIndex].url} alt={ordered[currentIndex].alt || fallbackAlt} loading="lazy" />
    {ordered.length > 1 && <><button type="button" className="news-carousel-arrow is-previous" aria-label="Imagen anterior" onClick={() => go(currentIndex - 1)}>←</button><button type="button" className="news-carousel-arrow is-next" aria-label="Imagen siguiente" onClick={() => go(currentIndex + 1)}>→</button><div className="news-carousel-dots" aria-label={`Imagen ${currentIndex + 1} de ${ordered.length}`}>{ordered.map((image, position) => <button type="button" key={`${image.url}-${position}`} aria-label={`Ver imagen ${position + 1}`} aria-current={position === currentIndex} onClick={() => setIndex(position)} />)}</div></>}
  </div>
}
