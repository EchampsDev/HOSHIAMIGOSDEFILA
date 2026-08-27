export type ConstellationScene = {
  referenceX: number
  referenceY: number
  starX: number
  starY: number
  starScale: number
  starIntensity: number
}

export const CONSTELLATION_SCENE_STORAGE_KEY = 'brattypolitan.constellation-scene.v1'

export const defaultConstellationScene: ConstellationScene = {
  referenceX: 50,
  referenceY: 51,
  starX: 50,
  starY: 22,
  starScale: 1,
  starIntensity: 1,
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
