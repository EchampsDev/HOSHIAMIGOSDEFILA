import { useEffect, useRef, useState } from 'react'
import { availableSlots } from '../../contributions/domain/pageAvailability'
import type { PendingPageCounts } from '../../contributions/repositories/ContributionRepository'
import { isElementOwner, pageCapacity, type ScrapbookPage } from '../domain/types'

type Props = {
  open: boolean
  pages?: ScrapbookPage[]
  pageCount: number
  current: number
  ownerId?: string | null
  mode?: 'browse' | 'select'
  contributionType?: 'STICKER' | 'MAIN'
  pending?: PendingPageCounts
  reservedPages?: ReadonlySet<number>
  canManageReservations?: boolean
  reservationBusy?: boolean
  reservationError?: string | null
  allowCurrentFull?: boolean
  title?: string
  onClose: () => void
  onGoTo: (page: number) => void
  onSetReserved?: (pages: number[], reserved: boolean) => Promise<void>
}

export function PageIndex({ open, pages, pageCount, current, ownerId, mode = 'browse', contributionType = 'MAIN', pending = {}, reservedPages = new Set<number>(), canManageReservations = false, reservationBusy = false, reservationError, allowCurrentFull = false, title = 'Elige una cara', onClose, onGoTo, onSetReserved }: Props) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [editingReservations, setEditingReservations] = useState(false)
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set())
  const [reservationMessage, setReservationMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => {
      const grid = gridRef.current
      const selected = grid?.querySelector<HTMLElement>('.is-current')
      if (grid && selected) grid.scrollTo({ top: selected.offsetTop - grid.offsetTop - grid.clientHeight / 2, behavior: 'smooth' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  const closeIndex = () => {
    setEditingReservations(false)
    setSelectedPages(new Set())
    setReservationMessage(null)
    onClose()
  }

  if (!open) return null

  const selected = [...selectedPages]
  const canReserve = selected.some((pageNumber) => !reservedPages.has(pageNumber))
  const canRelease = selected.some((pageNumber) => reservedPages.has(pageNumber))
  const togglePage = (pageNumber: number) => setSelectedPages((currentSet) => {
    const next = new Set(currentSet)
    if (next.has(pageNumber)) next.delete(pageNumber)
    else next.add(pageNumber)
    return next
  })
  const updateReservation = async (reserved: boolean) => {
    if (!onSetReserved) return
    const targets = selected.filter((pageNumber) => reserved ? !reservedPages.has(pageNumber) : reservedPages.has(pageNumber))
    if (!targets.length) return
    setReservationMessage(null)
    try {
      await onSetReserved(targets, reserved)
      setSelectedPages(new Set())
      setReservationMessage(reserved ? 'Las caras seleccionadas quedaron reservadas para administración.' : 'Las caras seleccionadas volvieron a estar disponibles.')
    } catch {
      setReservationMessage('No fue posible actualizar las caras seleccionadas.')
    }
  }

  return <div className="album-index-backdrop" role="dialog" aria-modal="true" aria-label="Índice de páginas" onClick={closeIndex}>
    <section className="album-index" onClick={(event) => event.stopPropagation()}>
      <div className="album-index-heading">
        <p>{editingReservations ? 'EDICIÓN DE RESERVAS' : mode === 'select' ? 'ESPACIOS DISPONIBLES' : 'ÍNDICE'}</p>
        <div>{mode === 'select' && canManageReservations && <button type="button" className={editingReservations ? 'album-index-edit is-active' : 'album-index-edit'} onClick={() => { setEditingReservations((value) => !value); setSelectedPages(new Set()); setReservationMessage(null) }} aria-label={editingReservations ? 'Cerrar edición de reservas' : 'Editar caras reservadas'} title="Editar caras reservadas">✎</button>}<button type="button" onClick={closeIndex}>Cerrar ×</button></div>
      </div>
      <h2>{editingReservations ? 'Selecciona las caras' : title}</h2>
      <p className="album-index-help">{editingReservations ? 'Marca una o varias caras. Reservarlas impedirá únicamente nuevos envíos; las aportaciones existentes permanecerán intactas.' : 'Cada cara admite cuatro recuerdos principales y diez stickers. Los espacios pendientes y las reservas administrativas cuentan para la disponibilidad.'}</p>
      {editingReservations && <div className="album-index-reservation-tools">
        <span>{selected.length ? `${selected.length} ${selected.length === 1 ? 'cara seleccionada' : 'caras seleccionadas'}` : 'Selecciona al menos una cara'}</span>
        <div><button type="button" disabled={!canReserve || reservationBusy} onClick={() => void updateReservation(true)}>Marcar como reservada</button><button type="button" disabled={!canRelease || reservationBusy} onClick={() => void updateReservation(false)}>Quitar reserva</button><button type="button" disabled={reservationBusy} onClick={() => { setEditingReservations(false); setSelectedPages(new Set()) }}>Cancelar</button></div>
      </div>}
      {(reservationMessage || reservationError) && <p className="album-index-reservation-message" role="status">{reservationMessage || reservationError}</p>}
      <div className="album-index-grid" ref={gridRef}>{Array.from({ length: pageCount }, (_, index) => {
        const number = index + 1
        const page = pages?.[index]
        const capacity = page ? pageCapacity(page) : { used: 0, remaining: 4, isFull: false }
        const reserved = reservedPages.has(number)
        const available = page ? availableSlots(page, pending, contributionType === 'STICKER' ? 'STICKER' : 'PHOTO', reservedPages) : reserved ? 0 : contributionType === 'STICKER' ? 10 : 4
        const full = available < 1
        const hasOwned = Boolean(page?.elements.some((element) => isElementOwner(element, ownerId)))
        const checked = selectedPages.has(number)
        const disabled = !editingReservations && mode === 'select' && full && !(allowCurrentFull && number === current && !reserved)
        return <button type="button" key={number} className={`${current === number && !editingReservations ? 'is-current ' : ''}${full ? 'is-full ' : ''}${reserved ? 'is-reserved ' : ''}${checked ? 'is-admin-selected ' : ''}${hasOwned ? 'has-owned' : ''}`} disabled={disabled || reservationBusy} onClick={() => { if (editingReservations) { togglePage(number); return }; onGoTo(number); closeIndex() }}>
          <small>{contributionType === 'STICKER' ? `${page ? pageCapacity(page).stickersUsed : 0}/10 stickers` : `${capacity.used}/4 publicados`}</small><span className="album-index-check" aria-hidden="true">{editingReservations ? checked ? '✓' : '' : current === number ? '✓' : ''}</span><b>{number}</b><em>{reserved ? 'Reservada' : full ? hasOwned ? 'Tu elemento' : 'Llena' : `${available} libres`}</em>
        </button>
      })}</div>
    </section>
  </div>
}
