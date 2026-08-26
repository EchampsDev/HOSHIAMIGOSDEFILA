import { createElement, type AlbumDocument, type ScrapbookPage } from '../domain/types'

function page(pageNumber: number): ScrapbookPage {
  const now = new Date().toISOString()
  return { id: `page-${pageNumber}`, pageNumber, paperType: pageNumber % 3 === 0 ? 'LINED' : 'GRID', elements: [], updatedAt: now }
}

export function createDefaultAlbum(): AlbumDocument {
  const pages = Array.from({ length: 100 }, (_, index) => page(index + 1))
  pages[0].title = 'ARCHIVO COLECTIVO'
  pages[0].elements = [
    { ...createElement(pages[0].id, 'POST_IT', 1), content: 'BRATTYPOLITAN EXPERIENCE\nUn archivo hecho por fans.', layout: { x: .17, y: .2, width: .56, height: .26, rotation: -2, zIndex: 2, locked: false, hidden: false } },
    { ...createElement(pages[0].id, 'STICKER', 2), content: '✦ 2026', layout: { x: .58, y: .62, width: .22, height: .12, rotation: 8, zIndex: 3, locked: false, hidden: false } },
  ]
  pages[1].elements = [{ ...createElement(pages[1].id, 'PLACEHOLDER', 1), content: 'Este espacio espera un recuerdo.', layout: { x: .18, y: .27, width: .62, height: .25, rotation: 0, zIndex: 1, locked: false, hidden: false } }]
  return { id: 'brattypolitan-scrapbook', title: 'BRATTYPOLITAN EXPERIENCE', pageCount: 100, pages, schemaVersion: 1, updatedAt: new Date().toISOString() }
}
