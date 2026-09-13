export type ElementReactions = Record<string, string[]>

export interface ElementReactionRepository {
  readonly usesFirebase: boolean
  subscribe(listener: (reactions: ElementReactions) => void, onError?: (error: unknown) => void): () => void
  toggle(elementId: string, userId: string): Promise<void>
}
