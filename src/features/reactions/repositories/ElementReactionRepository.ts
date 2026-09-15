export type ElementReaction = { userId: string; displayName: string }
export type ElementReactions = Record<string, ElementReaction[]>

export interface ElementReactionRepository {
  readonly usesFirebase: boolean
  subscribe(listener: (reactions: ElementReactions) => void, onError?: (error: unknown) => void): () => void
  toggle(elementId: string, userId: string, displayName: string): Promise<void>
}
