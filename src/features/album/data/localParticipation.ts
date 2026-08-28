const KEY = 'brattypolitan.participation.local.v1'

export type LocalParticipationSettings = { isOpen: boolean }

export function readLocalParticipationSettings(): LocalParticipationSettings {
  try { return { isOpen: Boolean(JSON.parse(window.localStorage.getItem(KEY) ?? '{}').isOpen) } } catch { return { isOpen: false } }
}

export function writeLocalParticipationSettings(settings: LocalParticipationSettings) {
  window.localStorage.setItem(KEY, JSON.stringify(settings))
  window.dispatchEvent(new Event('brattypolitan-participation-change'))
}
