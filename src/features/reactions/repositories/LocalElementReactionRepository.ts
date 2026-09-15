import type { ElementReactionRepository, ElementReactions } from './ElementReactionRepository'

const STORAGE_KEY = 'brattypolitan.element-reactions.v1'
const EVENT = 'brattypolitan-element-reactions-change'

function read(): ElementReactions {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, Array<string | { userId: string; displayName?: string }>>
    return Object.fromEntries(Object.entries(stored).map(([elementId, reactions]) => [elementId, reactions.map((reaction) => typeof reaction === 'string' ? { userId: reaction, displayName: 'Anónimo' } : { userId: reaction.userId, displayName: reaction.displayName?.trim() || 'Anónimo' })]))
  }
  catch { return {} }
}

export class LocalElementReactionRepository implements ElementReactionRepository {
  readonly usesFirebase = false

  subscribe(listener: (reactions: ElementReactions) => void) {
    const refresh = () => listener(read())
    refresh()
    window.addEventListener(EVENT, refresh)
    return () => window.removeEventListener(EVENT, refresh)
  }

  async toggle(elementId: string, userId: string, displayName: string) {
    const reactions = read()
    const users = reactions[elementId] ?? []
    reactions[elementId] = users.some((reaction) => reaction.userId === userId) ? users.filter((reaction) => reaction.userId !== userId) : [...users, { userId, displayName: displayName.trim() || 'Anónimo' }]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reactions))
    window.dispatchEvent(new Event(EVENT))
  }
}
