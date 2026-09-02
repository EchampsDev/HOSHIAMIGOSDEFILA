import { isElementOwner, pageCapacity, type ScrapbookPage } from '../domain/types'

type Props = { open: boolean; pages?: ScrapbookPage[]; pageCount: number; current: number; ownerId?: string | null; mode?: 'browse' | 'select'; allowCurrentFull?: boolean; title?: string; onClose: () => void; onGoTo: (page: number) => void }

export function PageIndex({ open, pages, pageCount, current, ownerId, mode = 'browse', allowCurrentFull = false, title = 'Elige una cara', onClose, onGoTo }: Props) {
  if (!open) return null
  return <div className="album-index-backdrop" role="dialog" aria-modal="true" aria-label="Índice de páginas" onClick={onClose}>
    <section className="album-index" onClick={(event) => event.stopPropagation()}>
      <div><p>{mode === 'select' ? 'ESPACIOS DISPONIBLES' : 'ÍNDICE'}</p><button type="button" onClick={onClose}>Cerrar ×</button></div>
      <h2>{title}</h2>
      <p className="album-index-help">Cada cara admite hasta cuatro elementos. Las caras completas quedan bloqueadas, salvo cuando ya contienen una publicación tuya.</p>
      <div className="album-index-grid">{Array.from({ length: pageCount }, (_, index) => {
        const number = index + 1
        const page = pages?.[index]
        const capacity = page ? pageCapacity(page) : { used: 0, remaining: 4, isFull: false }
        const hasOwned = Boolean(page?.elements.some((element) => isElementOwner(element, ownerId)))
        const disabled = mode === 'select' && capacity.isFull && !(allowCurrentFull && number === current)
        return <button type="button" key={number} className={`${current === number ? 'is-current ' : ''}${capacity.isFull ? 'is-full ' : ''}${hasOwned ? 'has-owned' : ''}`} disabled={disabled} onClick={() => { onGoTo(number); onClose() }}>
          <small>{capacity.used}/4 publicados</small><span className="album-index-check" aria-hidden="true">{current === number ? '✓' : ''}</span><b>{number}</b><em>{capacity.isFull ? hasOwned ? 'Tu elemento' : 'Llena' : `${capacity.remaining} libres`}</em>
        </button>
      })}</div>
    </section>
  </div>
}
