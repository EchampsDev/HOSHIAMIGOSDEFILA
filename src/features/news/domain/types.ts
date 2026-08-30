export type NewsStatus = 'draft' | 'published' | 'archived'
export type NewsImageProvider = 'github' | 'firebase'

export type NewsImage = {
  url: string
  alt: string
  order: number
  provider?: NewsImageProvider
  storagePath?: string
}

export type NewsItem = {
  id: string
  title: string
  description: string
  slug: string
  images: NewsImage[]
  carouselAlt?: string
  instagramUrl?: string
  facebookUrl?: string
  xUrl?: string
  tiktokUrl?: string
  order: number
  visible: boolean
  status: NewsStatus
  publishedAt?: string
  publishedBy?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export type NewsDraft = Omit<NewsItem, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'publishedBy' | 'deletedAt'>

export type NewsPublishedEvent = {
  id: string
  type: 'NEWS_PUBLISHED'
  newsId: string
  slug: string
  title: string
  summary: string
  publishedAt: string
  publishedBy: string
  distributionRequested: boolean
}

export const emptyNewsDraft = (): NewsDraft => ({
  title: '', description: '', slug: '', images: [], order: 0, visible: true, status: 'draft',
})

export function createStableSlug(title: string) {
  return title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90)
}
