import { useCallback, useEffect, useMemo, useState } from 'react'

const CHANGE_EVENT = 'brattypolitan-sticker-favorites-change'

function storageKey(userId?: string | null) {
  return `brattypolitan.sticker-favorites.v1:${userId || 'guest'}`
}

function readFavorites(key: string) {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []
  } catch { return [] }
}

export function useStickerFavorites(userId?: string | null) {
  const key = storageKey(userId)
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => readFavorites(key))

  useEffect(() => {
    const sync = () => setFavoriteIds(readFavorites(key))
    queueMicrotask(sync)
    window.addEventListener('storage', sync)
    window.addEventListener(CHANGE_EVENT, sync)
    return () => { window.removeEventListener('storage', sync); window.removeEventListener(CHANGE_EVENT, sync) }
  }, [key])

  const toggleFavorite = useCallback((stickerId: string) => {
    const current = readFavorites(key)
    const next = current.includes(stickerId) ? current.filter((id) => id !== stickerId) : [...current, stickerId]
    localStorage.setItem(key, JSON.stringify(next))
    setFavoriteIds(next)
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
  }, [key])

  const favorites = useMemo(() => new Set(favoriteIds), [favoriteIds])
  return { favorites, toggleFavorite }
}
