export const backgroundFitValues = ['cover', 'contain', 'repeat', 'extended'] as const
export type BackgroundFit = typeof backgroundFitValues[number]

export const backgroundPositionValues = [
  'top left', 'top center', 'top right',
  'center left', 'center center', 'center right',
  'bottom left', 'bottom center', 'bottom right',
] as const
export type BackgroundPosition = typeof backgroundPositionValues[number]

export type BrattychartsBackground = {
  id: string
  name: string
  imageUrl: string
  storagePath: string
  enabled: boolean
  selected: boolean
  order: number
  fit: BackgroundFit
  position: BackgroundPosition
  overlayOpacity: number
  blurPx: number
  createdAt: string
  updatedAt: string
}

export type BrattychartsAppearanceSettings = {
  backgroundIds: string[]
  slideshowIntervalMs: number
  transitionMs: number
  videoEnabled: boolean
  videoUrl?: string
  videoStoragePath?: string
  videoOriginalName?: string
  videoContentType?: string
  videoDurationSeconds?: number
  updatedAt: string
}

export type BrattychartsAppearance = {
  settings: BrattychartsAppearanceSettings
  backgrounds: BrattychartsBackground[]
}

export const defaultBrattychartsAppearanceSettings: BrattychartsAppearanceSettings = {
  backgroundIds: [],
  slideshowIntervalMs: 8_000,
  transitionMs: 1_200,
  videoEnabled: false,
  updatedAt: '',
}
