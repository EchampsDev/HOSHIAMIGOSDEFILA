import type { CommunitySticker } from './types'

export type StickerGroup = {
  id: string
  name: string
}

export type StickerCatalog = {
  groups: StickerGroup[]
  assignments: Record<string, string>
  updatedAt: string
}

export type StickerGroupSection = StickerGroup & {
  stickers: CommunitySticker[]
}

export const COMMUNITY_STICKER_GROUP_ID = 'community'
export const UNCATEGORIZED_STICKER_GROUP_ID = 'uncategorized'

export const DEFAULT_STICKER_GROUPS: StickerGroup[] = [
  { id: 'vinyls', name: 'Vinilos' },
  { id: 'concerts', name: 'Conciertos' },
  { id: 'ai', name: 'Hechos con IA' },
  { id: COMMUNITY_STICKER_GROUP_ID, name: 'Aportaciones de la comunidad' },
]

export const createDefaultStickerCatalog = (): StickerCatalog => ({
  groups: DEFAULT_STICKER_GROUPS.map((group) => ({ ...group })),
  assignments: {},
  updatedAt: new Date(0).toISOString(),
})

export function normalizeStickerCatalog(value?: Partial<StickerCatalog> | null): StickerCatalog {
  const seen = new Set<string>()
  const groups = (Array.isArray(value?.groups) ? value.groups : DEFAULT_STICKER_GROUPS)
    .filter((group): group is StickerGroup => Boolean(group && typeof group.id === 'string' && typeof group.name === 'string'))
    .map((group) => ({ id: group.id.trim().slice(0, 80), name: group.name.trim().slice(0, 60) }))
    .filter((group) => group.id && group.name && !seen.has(group.id) && Boolean(seen.add(group.id)))
  const validGroupIds = new Set(groups.map((group) => group.id))
  const assignments = Object.fromEntries(Object.entries(value?.assignments ?? {}).filter(([stickerId, groupId]) => stickerId && typeof groupId === 'string' && validGroupIds.has(groupId)))
  return { groups, assignments, updatedAt: typeof value?.updatedAt === 'string' ? value.updatedAt : new Date(0).toISOString() }
}

export function stickerGroupId(sticker: CommunitySticker, catalog: StickerCatalog) {
  const assigned = catalog.assignments[sticker.id]
  if (assigned && catalog.groups.some((group) => group.id === assigned)) return assigned
  if (sticker.ownerUid && catalog.groups.some((group) => group.id === COMMUNITY_STICKER_GROUP_ID)) return COMMUNITY_STICKER_GROUP_ID
  return UNCATEGORIZED_STICKER_GROUP_ID
}

export function groupStickers(stickers: CommunitySticker[], catalog: StickerCatalog, includeEmpty = false): StickerGroupSection[] {
  const sections = catalog.groups.map((group) => ({ ...group, stickers: stickers.filter((sticker) => stickerGroupId(sticker, catalog) === group.id) }))
  const uncategorized = stickers.filter((sticker) => stickerGroupId(sticker, catalog) === UNCATEGORIZED_STICKER_GROUP_ID)
  if (uncategorized.length) sections.push({ id: UNCATEGORIZED_STICKER_GROUP_ID, name: 'Sin clasificar', stickers: uncategorized })
  return includeEmpty ? sections : sections.filter((section) => section.stickers.length)
}
