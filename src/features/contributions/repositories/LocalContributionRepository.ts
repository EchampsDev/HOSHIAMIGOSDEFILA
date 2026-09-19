import { createDefaultAlbum } from '../../album/data/defaultAlbum'
import { LocalAlbumRepository } from '../../album/repositories/LocalAlbumRepository'
import { pageCapacity } from '../../album/domain/types'
import { materializeContribution } from '../domain/materializeContribution'
import type { ContributionInput, ContributionRecord } from '../domain/types'
import type { ContributionRepository, PendingPageCounts } from './ContributionRepository'

const KEY = 'brattypolitan.contributions.pending.v2'
const EVENT = 'brattypolitan-contributions-change'
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

function read(): ContributionRecord[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(value) ? value.map((item: ContributionRecord) => ({ ...item, visibility: item.visibility ?? 'PUBLIC' })) : []
  }
  catch { return [] }
}
function write(items: ContributionRecord[]) { localStorage.setItem(KEY, JSON.stringify(items)); window.dispatchEvent(new Event(EVENT)) }

export class LocalContributionRepository implements ContributionRepository {
  readonly usesFirebase = false
  async submit(input: ContributionInput) {
    const existing = input.id ? read().find((item) => item.id === input.id) : undefined
    if (existing) return existing
    const now = new Date().toISOString()
    const record: ContributionRecord = { ...copy(input), id: input.id ?? crypto.randomUUID(), participantId: input.author.participantId, status: 'PENDING', createdAt: now, updatedAt: now }
    write([...read(), record])
    return record
  }
  subscribePending(listener: (items: ContributionRecord[]) => void) {
    const refresh = () => listener(read().filter((item) => item.status === 'PENDING').sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    refresh(); window.addEventListener(EVENT, refresh)
    return () => window.removeEventListener(EVENT, refresh)
  }
  async approve(id: string, adminUid: string) {
    const records = read(); const contribution = records.find((item) => item.id === id)
    if (!contribution) return
    const repository = new LocalAlbumRepository(); const album = await repository.getAlbum().catch(() => createDefaultAlbum())
    const page = album.pages[contribution.pageNumber - 1]
    if (!page || (contribution.type === 'STICKER' ? pageCapacity(page).stickersFull : pageCapacity(page).isFull)) throw new Error('La cara elegida ya está llena para ese tipo de aportación.')
    const element = materializeContribution(contribution, page)
    await repository.savePage({ ...page, elements: [...page.elements, element], updatedAt: new Date().toISOString() })
    const now = new Date().toISOString(); write(records.map((item) => item.id === id ? { ...item, status: 'APPROVED', reviewedAt: now, reviewedBy: adminUid, updatedAt: now } : item))
  }
  async reject(id: string, adminUid: string) {
    const now = new Date().toISOString(); write(read().map((item) => item.id === id ? { ...item, status: 'REJECTED', reviewedAt: now, reviewedBy: adminUid, updatedAt: now } : item))
  }
  subscribeAvailability(listener: (counts: PendingPageCounts) => void) {
    const refresh = () => {
      const counts: PendingPageCounts = {}
      for (const item of read()) {
        if (item.status !== 'PENDING') continue
        const current = counts[item.pageNumber] ?? { main: 0, stickers: 0 }
        if (item.type === 'STICKER') current.stickers += 1
        else current.main += 1
        counts[item.pageNumber] = current
      }
      listener(counts)
    }
    refresh(); window.addEventListener(EVENT, refresh)
    return () => window.removeEventListener(EVENT, refresh)
  }
  async movePending(id: string, pageNumber: number, adminUid: string) {
    const album = await new LocalAlbumRepository().getAlbum().catch(() => createDefaultAlbum())
    const page = album.pages[pageNumber - 1]
    const contribution = read().find((item) => item.id === id && item.status === 'PENDING')
    if (!page || !contribution || (contribution.type === 'STICKER' ? pageCapacity(page).stickersFull : pageCapacity(page).isFull)) throw new Error('No hay espacio disponible en esa cara.')
    const now = new Date().toISOString()
    write(read().map((item) => item.id === id ? { ...item, pageNumber, movedAt: now, movedBy: adminUid, updatedAt: now } : item))
  }
  async deletePending(id: string, adminUid: string) {
    const now = new Date().toISOString()
    write(read().map((item) => item.id === id && item.status === 'PENDING' ? { ...item, status: 'DELETED', deletedAt: now, deletedBy: adminUid, updatedAt: now } : item))
  }
  async deletePublished(pageId: string, elementId: string, adminUid: string) {
    const repository = new LocalAlbumRepository()
    const page = await repository.getPage(pageId)
    const element = page?.elements.find((item) => item.id === elementId)
    if (!page || !element) throw new Error('La aportación ya no existe.')
    const now = new Date().toISOString()
    await repository.savePage({ ...page, elements: page.elements.map((item) => item.id === elementId ? { ...item, layout: { ...item.layout, hidden: true }, updatedAt: now } : item), updatedAt: now })
    if (element.contributionId) write(read().map((item) => item.id === element.contributionId ? { ...item, status: 'DELETED', deletedAt: now, deletedBy: adminUid, updatedAt: now } : item))
  }
  async reconcileAvailability() {}
}
