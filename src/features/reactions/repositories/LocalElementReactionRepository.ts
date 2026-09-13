import type { ElementReactionRepository, ElementReactions } from './ElementReactionRepository'

const STORAGE_KEY = 'brattypolitan.element-reactions.v1'
const EVENT = 'brattypolitan-element-reactions-change'

function read(): ElementReactions {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as ElementReactions }
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

  async toggle(elementId: string, userId: string) {
    const reactions = read()
    const users = reactions[elementId] ?? []
    reactions[elementId] = users.includes(userId) ? users.filter((id) => id !== userId) : [...users, userId]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reactions))
    window.dispatchEvent(new Event(EVENT))
  }
}
