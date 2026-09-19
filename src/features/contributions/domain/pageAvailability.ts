import { pageCapacity, type AlbumElementType, type ScrapbookPage } from '../../album/domain/types'
import type { PendingPageCounts } from '../repositories/ContributionRepository'

export function availableSlots(page: ScrapbookPage, pending: PendingPageCounts, type: AlbumElementType) {
  const capacity = pageCapacity(page)
  const reserved = pending[page.pageNumber] ?? { main: 0, stickers: 0 }
  return Math.max(0, type === 'STICKER' ? capacity.stickersRemaining - reserved.stickers : capacity.remaining - reserved.main)
}

export function recommendedPageNumber(pages: ScrapbookPage[], pending: PendingPageCounts, type: AlbumElementType, excluding?: number) {
  for (const minimum of [3, 2, 1]) {
    const match = pages.find((page) => page.pageNumber !== excluding && availableSlots(page, pending, type) >= minimum)
    if (match) return match.pageNumber
  }
  return null
}

export function pendingCountsFromItems(items: { pageNumber: number; type: AlbumElementType }[]): PendingPageCounts {
  const result: PendingPageCounts = {}
  for (const item of items) {
    const counts = result[item.pageNumber] ?? { main: 0, stickers: 0 }
    if (item.type === 'STICKER') counts.stickers += 1
    else counts.main += 1
    result[item.pageNumber] = counts
  }
  return result
}
