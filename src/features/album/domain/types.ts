export type PaperType = 'GRID' | 'LINED'
export type AlbumElementType = 'PHOTO' | 'POST_IT' | 'HANDWRITTEN_NOTE' | 'DRAWING' | 'STICKER' | 'TEXT' | 'SETLIST' | 'PLACEHOLDER' | 'OTHER'

export type SetlistEntry = { id: string; title: string; coverUrl?: string }
export type BookState = 'CLOSED' | 'PAGE' | 'BACK_COVER'

export type AuthorIdentity = {
  participantId: string
  displayName?: string
  age?: number
}

export type MediaMetadata = {
  originalWidth: number
  originalHeight: number
  displayWidth?: number
  displayHeight?: number
  mimeType: string
  fileSize: number
  storagePath?: string
  downloadUrl?: string
}

export type ElementLayout = {
  x: number
  y: number
  width: number
  height: number
  rotation: number
  zIndex: number
  locked: boolean
  hidden: boolean
}

export type AlbumElement = {
  id: string
  pageId: string
  type: AlbumElementType
  author: AuthorIdentity
  content?: string
  styleVariant?: string
  media?: MediaMetadata
  setlist?: SetlistEntry[]
  likedBy?: string[]
  contentRevealed?: boolean
  layout: ElementLayout
  createdAt: string
  updatedAt: string
}

export const MAX_ELEMENTS_PER_PAGE = 4

export function publishedElements(page: ScrapbookPage) {
  return page.elements.filter((element) => !element.layout.hidden)
}

export function pageCapacity(page: ScrapbookPage) {
  const used = publishedElements(page).length
  return { used, remaining: Math.max(0, MAX_ELEMENTS_PER_PAGE - used), isFull: used >= MAX_ELEMENTS_PER_PAGE }
}

export function isElementOwner(element: AlbumElement, participantId?: string | null) {
  return Boolean(participantId && element.author.participantId === participantId)
}

export function spreadStart(pageNumber: number, pageCount = 100) {
  const bounded = Math.min(Math.max(Math.round(pageNumber || 1), 1), pageCount)
  if (bounded === 1) return 1
  return bounded % 2 === 0 ? bounded : bounded - 1
}

export type ScrapbookPage = {
  id: string
  pageNumber: number
  paperType: PaperType
  elements: AlbumElement[]
  title?: string
  updatedAt: string
}

export type AlbumDocument = {
  id: string
  title: string
  pageCount: number
  pages: ScrapbookPage[]
  schemaVersion: 1
  updatedAt: string
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export function clampLayout(layout: ElementLayout): ElementLayout {
  const width = clamp(layout.width, .06, 1)
  const height = clamp(layout.height, .04, 1)
  return { ...layout, width, height, x: clamp(layout.x, 0, 1 - width), y: clamp(layout.y, 0, 1 - height) }
}

export function createElement(pageId: string, type: AlbumElementType, sequence: number, author: AuthorIdentity = { participantId: 'developer-local' }): AlbumElement {
  const now = new Date().toISOString()
  const contentByType: Partial<Record<AlbumElementType, string>> = {
    PHOTO: 'Foto por llegar', POST_IT: 'Una nota para Bratty', TEXT: 'Escribe aquí', SETLIST: 'MI SETLIST', PLACEHOLDER: 'Recuerdo pendiente', HANDWRITTEN_NOTE: 'Para recordar…', DRAWING: '✦', STICKER: 'BRATTY',
  }
  return {
    id: `element-${crypto.randomUUID?.() ?? `${Date.now()}-${sequence}`}`,
    pageId,
    type,
    author,
    content: contentByType[type] ?? 'Elemento',
    styleVariant: type === 'POST_IT' ? 'yellow' : 'default',
    layout: { x: .12 + (sequence % 3) * .08, y: .13 + (sequence % 2) * .09, width: type === 'SETLIST' ? .72 : type === 'PHOTO' ? .42 : .32, height: type === 'SETLIST' ? .29 : type === 'PHOTO' ? .30 : .18, rotation: type === 'POST_IT' ? -3 : 0, zIndex: sequence + 1, locked: false, hidden: false },
    createdAt: now,
    updatedAt: now,
  }
}
