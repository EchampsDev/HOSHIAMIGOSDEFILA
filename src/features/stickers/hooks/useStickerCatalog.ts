import { useCallback, useEffect, useState } from 'react'
import { createDefaultStickerCatalog, normalizeStickerCatalog, type StickerCatalog } from '../domain/catalog'
import { stickerCatalogRepository } from '../repositories'

type CatalogChange = (catalog: StickerCatalog) => StickerCatalog

export function useStickerCatalog() {
  const [catalog, setCatalog] = useState<StickerCatalog>(createDefaultStickerCatalog)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try { setCatalog(await stickerCatalogRepository.getCatalog()); setError(null) }
    catch { setError('No fue posible cargar los grupos de la colección.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    queueMicrotask(() => void refresh())
    return stickerCatalogRepository.subscribe(() => void refresh())
  }, [refresh])

  const change = useCallback(async (transform: CatalogChange) => {
    setSaving(true)
    try {
      const current = await stickerCatalogRepository.getCatalog()
      const next = normalizeStickerCatalog(transform(current))
      setCatalog(await stickerCatalogRepository.saveCatalog(next))
      setError(null)
    } catch { setError('No fue posible guardar la organización de la colección.') }
    finally { setSaving(false) }
  }, [])

  const addGroup = useCallback((name: string) => change((current) => ({ ...current, groups: [...current.groups, { id: `group-${crypto.randomUUID()}`, name }] })), [change])
  const renameGroup = useCallback((id: string, name: string) => change((current) => ({ ...current, groups: current.groups.map((group) => group.id === id ? { ...group, name } : group) })), [change])
  const removeGroup = useCallback((id: string) => change((current) => ({ ...current, groups: current.groups.filter((group) => group.id !== id), assignments: Object.fromEntries(Object.entries(current.assignments).filter(([, groupId]) => groupId !== id)) })), [change])
  const moveGroup = useCallback((id: string, direction: -1 | 1) => change((current) => {
    const groups = [...current.groups]
    const index = groups.findIndex((group) => group.id === id)
    const destination = index + direction
    if (index < 0 || destination < 0 || destination >= groups.length) return current
    ;[groups[index], groups[destination]] = [groups[destination], groups[index]]
    return { ...current, groups }
  }), [change])
  const assignSticker = useCallback((stickerId: string, groupId?: string) => change((current) => {
    const assignments = { ...current.assignments }
    if (groupId) assignments[stickerId] = groupId
    else delete assignments[stickerId]
    return { ...current, assignments }
  }), [change])

  return { catalog, loading, saving, error, addGroup, renameGroup, removeGroup, moveGroup, assignSticker }
}
