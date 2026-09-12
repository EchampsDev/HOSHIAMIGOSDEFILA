import { demoStickers } from '../data/demoStickers'
import { isPublicApprovedSticker, type CommunitySticker, type NewCommunitySticker } from '../domain/types'
import type { StickerRepository } from './StickerRepository'

const STORAGE_KEY = 'brattypolitan.sticker-library.metadata.v1'
const CHANGE_EVENT = 'brattypolitan-stickers-change'

function readUserStickers(): CommunitySticker[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as CommunitySticker[] }
  catch { return [] }
}

function readAll() {
  const userStickers = readUserStickers()
  return [...demoStickers, ...userStickers.filter((sticker) => !demoStickers.some((demo) => demo.id === sticker.id))]
}

function writeUserStickers(stickers: CommunitySticker[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stickers.filter((sticker) => !demoStickers.some((demo) => demo.id === sticker.id))))
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
}

export class LocalStickerRepository implements StickerRepository {
  async getApprovedStickers() { return readAll().filter(isPublicApprovedSticker).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }
  async getPendingStickers() { return readAll().filter((sticker) => sticker.status === 'PENDING').sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }
  async getSticker(id: string) { return readAll().find((sticker) => sticker.id === id) ?? null }
  async createSticker(input: NewCommunitySticker) {
    const now = new Date().toISOString()
    const sticker: CommunitySticker = { ...input, id: `sticker-${crypto.randomUUID()}`, createdAt: now, updatedAt: now }
    writeUserStickers([...readUserStickers(), sticker])
    return sticker
  }
  async updateSticker(id: string, patch: Partial<Omit<CommunitySticker, 'id' | 'createdAt'>>) {
    const existing = await this.getSticker(id)
    if (!existing || demoStickers.some((demo) => demo.id === id)) throw new Error('Este sticker base no se puede modificar.')
    const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() }
    writeUserStickers(readUserStickers().map((sticker) => sticker.id === id ? updated : sticker))
    return updated
  }
  async deleteSticker(id: string) { writeUserStickers(readUserStickers().filter((sticker) => sticker.id !== id)) }
  subscribe(listener: () => void) {
    window.addEventListener(CHANGE_EVENT, listener)
    window.addEventListener('storage', listener)
    return () => { window.removeEventListener(CHANGE_EVENT, listener); window.removeEventListener('storage', listener) }
  }
}
