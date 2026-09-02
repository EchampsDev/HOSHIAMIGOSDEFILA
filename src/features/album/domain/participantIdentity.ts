const PARTICIPANT_KEY = 'brattypolitan.album-participant-id'

export function getLocalParticipantId() {
  const saved = window.localStorage.getItem(PARTICIPANT_KEY)
  if (saved) return saved
  const id = `participant-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`
  window.localStorage.setItem(PARTICIPANT_KEY, id)
  return id
}
