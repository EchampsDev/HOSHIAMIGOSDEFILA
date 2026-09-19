import { clampLayout, createElement, type AlbumElement, type ElementLayout, type ScrapbookPage } from '../../album/domain/types'
import type { ContributionRecord } from './types'

const overlapRatio = (first: ElementLayout, second: ElementLayout) => {
  const width = Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x))
  const height = Math.max(0, Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y))
  return width * height / Math.max(.001, Math.min(first.width * first.height, second.width * second.height))
}

function placeElement(element: AlbumElement, existing: AlbumElement[]) {
  const candidates = [[.08, .08], [.54, .08], [.08, .38], [.54, .38], [.26, .22], [.14, .58], [.48, .58]]
  const current = clampLayout(element.layout)
  const collisionAt = (layout: ElementLayout) => Math.max(0, ...existing.map((other) => overlapRatio(layout, other.layout)))
  const roomiest = candidates
    .map(([x, y]) => clampLayout({ ...current, x, y }))
    .map((layout) => ({ layout, collision: collisionAt(layout) }))
    .sort((first, second) => first.collision - second.collision)[0]
  return { ...(collisionAt(current) > .34 && roomiest ? roomiest.layout : current), zIndex: Math.max(0, ...existing.map((other) => other.layout.zIndex)) + 1 }
}

export function materializeContribution(contribution: ContributionRecord, page: ScrapbookPage): AlbumElement {
  const element = createElement(page.id, contribution.type, page.elements.length + 1, contribution.author)
  Object.assign(element, {
    id: `element-${contribution.id}`,
    contributionId: contribution.id,
    createdAt: contribution.createdAt,
    content: contribution.content ?? element.content,
    media: contribution.media,
    setlist: contribution.setlist,
    styleVariant: contribution.styleVariant ?? element.styleVariant,
    stickerId: contribution.stickerId,
    visibility: contribution.visibility,
  })
  if (contribution.type === 'PHOTO') element.layout = { ...element.layout, width: .42, height: .3 }
  if (contribution.type === 'SETLIST') element.layout = { ...element.layout, width: .76, height: .34 }
  element.layout = placeElement(element, page.elements)
  return element
}
