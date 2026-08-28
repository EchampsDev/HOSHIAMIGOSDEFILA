import type { AlbumElement, AlbumElementType, AuthorIdentity } from '../domain/types'

const KEY = 'brattypolitan.participation.pending.v1'
export type PendingSubmission = { id: string; author: AuthorIdentity; type: AlbumElementType; content?: string; media?: AlbumElement['media']; pageNumbers: number[]; createdAt: string }
const copy = <T,>(value: T) => JSON.parse(JSON.stringify(value)) as T
export function readPendingSubmissions(): PendingSubmission[] { try { const value = JSON.parse(window.localStorage.getItem(KEY) ?? '[]'); return Array.isArray(value) ? copy(value) : [] } catch { return [] } }
export function writePendingSubmissions(items: PendingSubmission[]) { window.localStorage.setItem(KEY, JSON.stringify(items)); window.dispatchEvent(new Event('brattypolitan-moderation-change')) }
