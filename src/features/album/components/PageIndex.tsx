import { isElementOwner, pageCapacity, type ScrapbookPage } from '../domain/types'
import { availableSlots } from '../../contributions/domain/pageAvailability'
import type { PendingPageCounts } from '../../contributions/repositories/ContributionRepository'

type Props = { open: boolean; pages?: ScrapbookPage[]; pageCount: number; current: number; ownerId?: string | null; mode?: 'browse' | 'select'; contributionType?: 'STICKER' | 'MAIN'; pending?: PendingPageCounts; allowCurrentFull?: boolean; title?: string; onClose: () => void; onGoTo: (page: number) => void }

export function PageIndex({ open, pages, pageCount, current, ownerId, mode = 'browse', contributionType = 'MAIN', pending = {}, allowCurrentFull = false, title = 'Elige una cara', onClose, onGoTo }: Props) {
  const gridRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => {
      const grid = gridRef.current
      const selected = grid?.querySelector<HTMLElement>('.is-current')
      if (grid && selected) grid.scrollTo({ top: selected.offsetTop - grid.offsetTop - grid.clientHeight / 2, behavior: 'smooth' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open])
  if (!open) return null
  return <div className="album-index-backdrop" role="dialog" aria-modal="true" aria-label="Índice de páginas" onClick={onClose}>
    <section className="album-index" onClick={(event) => event.stopPropagation()}>
      <div><p>{mode === 'select' ? 'ESPACIOS DISPONIBLES' : 'ÍNDICE'}</p><button type="button" onClick={onClose}>Cerrar ×</button></div>
      <h2>{title}</h2>
      <p className="album-index-help">Cada cara admite cuatro recuerdos principales y diez stickers. Los espacios pendientes también cuentan para la disponibilidad.</p>
      <div className="album-index-grid" ref={gridRef}>{Array.from({ length: pageCount }, (_, index) => {
        const number = index + 1
        const page = pages?.[index]
        const capacity = page ? pageCapacity(page) : { used: 0, remaining: 4, isFull: false }
        const available = page ? availableSlots(page, pending, contributionType === 'STICKER' ? 'STICKER' : 'PHOTO') : contributionType === 'STICKER' ? 10 : 4
        const full = available < 1
        const hasOwned = Boolean(page?.elements.some((element) => isElementOwner(element, ownerId)))
        const disabled = mode === 'select' && full && !(allowCurrentFull && number === current)
        return <button type="button" key={number} className={`${current === number ? 'is-current ' : ''}${full ? 'is-full ' : ''}${hasOwned ? 'has-owned' : ''}`} disabled={disabled} onClick={() => { onGoTo(number); onClose() }}>
          <small>{contributionType === 'STICKER' ? `${page ? pageCapacity(page).stickersUsed : 0}/10 stickers` : `${capacity.used}/4 publicados`}</small><span className="album-index-check" aria-hidden="true">{current === number ? '✓' : ''}</span><b>{number}</b><em>{full ? hasOwned ? 'Tu elemento' : 'Llena' : `${available} libres`}</em>
        </button>
      })}</div>
    </section>
  </div>
}
import { useEffect, useRef } from 'react'
