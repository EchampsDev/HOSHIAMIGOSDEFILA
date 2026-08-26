export type ConstellationScene = {
  referenceX: number
  referenceY: number
}

export const CONSTELLATION_SCENE_STORAGE_KEY = 'brattypolitan.constellation-scene.v1'

export const defaultConstellationScene: ConstellationScene = {
  referenceX: 50,
  referenceY: 51,
}

export function readConstellationScene(): ConstellationScene {
  try {
    const stored = window.localStorage.getItem(CONSTELLATION_SCENE_STORAGE_KEY)
    if (!stored) return defaultConstellationScene
    return { ...defaultConstellationScene, ...JSON.parse(stored) as Partial<ConstellationScene> }
  } catch {
    return defaultConstellationScene
  }
}
