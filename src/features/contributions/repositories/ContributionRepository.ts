import type { ContributionInput, ContributionRecord } from '../domain/types'
export type PendingPageCounts = Record<number, { main: number; stickers: number }>

export interface ContributionRepository {
  readonly usesFirebase: boolean
  submit(input: ContributionInput): Promise<ContributionRecord>
  subscribePending(listener: (items: ContributionRecord[]) => void, onError?: (error: unknown) => void): () => void
  subscribeAvailability(listener: (counts: PendingPageCounts) => void, onError?: (error: unknown) => void): () => void
  approve(id: string, adminUid: string): Promise<void>
  reject(id: string, adminUid: string): Promise<void>
  movePending(id: string, pageNumber: number, adminUid: string): Promise<void>
  deletePending(id: string, adminUid: string): Promise<void>
  deletePublished(pageId: string, elementId: string, adminUid: string): Promise<void>
  reconcileAvailability(): Promise<void>
}
