import type { ContributionInput, ContributionRecord } from '../domain/types'

export interface ContributionRepository {
  readonly usesFirebase: boolean
  submit(input: ContributionInput): Promise<ContributionRecord>
  subscribePending(listener: (items: ContributionRecord[]) => void, onError?: (error: unknown) => void): () => void
  approve(id: string, adminUid: string): Promise<void>
  reject(id: string, adminUid: string): Promise<void>
}
