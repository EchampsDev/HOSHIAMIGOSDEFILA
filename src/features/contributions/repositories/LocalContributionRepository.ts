import { createDefaultAlbum } from '../../album/data/defaultAlbum'
import { LocalAlbumRepository } from '../../album/repositories/LocalAlbumRepository'
import { pageCapacity } from '../../album/domain/types'
import { materializeContribution } from '../domain/materializeContribution'
import type { ContributionInput, ContributionRecord } from '../domain/types'
import type { ContributionRepository } from './ContributionRepository'

const KEY = 'brattypolitan.contributions.pending.v2'
const EVENT = 'brattypolitan-contributions-change'
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

function read(): ContributionRecord[] {
  try { const value = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(value) ? value : [] }
  catch { return [] }
}
function write(items: ContributionRecord[]) { localStorage.setItem(KEY, JSON.stringify(items)); window.dispatchEvent(new Event(EVENT)) }

export class LocalContributionRepository implements ContributionRepository {
  readonly usesFirebase = false
  async submit(input: ContributionInput) {
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
    if (!page || pageCapacity(page).isFull) throw new Error('La cara elegida ya está llena.')
    const element = materializeContribution(contribution, page)
    await repository.savePage({ ...page, elements: [...page.elements, element], updatedAt: new Date().toISOString() })
    const now = new Date().toISOString(); write(records.map((item) => item.id === id ? { ...item, status: 'APPROVED', reviewedAt: now, reviewedBy: adminUid, updatedAt: now } : item))
  }
  async reject(id: string, adminUid: string) {
    const now = new Date().toISOString(); write(read().map((item) => item.id === id ? { ...item, status: 'REJECTED', reviewedAt: now, reviewedBy: adminUid, updatedAt: now } : item))
  }
}
