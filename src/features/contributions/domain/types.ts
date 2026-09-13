import type { AlbumElementType, AuthorIdentity, MediaMetadata, SetlistEntry } from '../../album/domain/types'

export type ContributionStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type ContributionInput = {
  id?: string
  pageNumber: number
  type: AlbumElementType
  author: AuthorIdentity
  content?: string
  media?: MediaMetadata
  setlist?: SetlistEntry[]
  styleVariant?: string
  stickerId?: string
}

export type ContributionRecord = ContributionInput & {
  id: string
  participantId: string
  status: ContributionStatus
  createdAt: string
  updatedAt: string
  reviewedAt?: string
  reviewedBy?: string
}
