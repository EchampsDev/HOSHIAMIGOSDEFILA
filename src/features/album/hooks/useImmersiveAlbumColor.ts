import { useEffect, useState, type RefObject } from 'react'
import type { BookState } from '../domain/types'

export type AmbientRgb = [number, number, number]

const COVER_RED: AmbientRgb = [244, 24, 55]
const EMPTY_PAGE: AmbientRgb = [92, 58, 47]
const SAMPLE_SIZE = 30

type Bucket = { score: number; red: number; green: number; blue: number; weight: number }

const addColor = (buckets: Map<string, Bucket>, red: number, green: number, blue: number, weight = 1) => {
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const saturation = max ? (max - min) / max : 0
  if (max < 28 || (max > 244 && saturation < .08)) return
  const colorWeight = weight * (.32 + saturation * 1.75)
  const key = `${red >> 5}-${green >> 5}-${blue >> 5}`
  const bucket = buckets.get(key) ?? { score: 0, red: 0, green: 0, blue: 0, weight: 0 }
  bucket.score += colorWeight
  bucket.red += red * colorWeight
  bucket.green += green * colorWeight
  bucket.blue += blue * colorWeight
  bucket.weight += colorWeight
  buckets.set(key, bucket)
}

const parseCssColor = (value: string) => {
  const match = value.match(/rgba?\(\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)(?:\s*[,/]\s*(\d+(?:\.\d+)?))?/i)
  if (!match || Number(match[4] ?? 1) < .18) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])] as AmbientRgb
}

const waitForImage = (image: HTMLImageElement, timeout = 3_500) => new Promise<void>((resolve) => {
  if (image.complete) { resolve(); return }
  const done = () => { window.clearTimeout(timer); image.removeEventListener('load', done); image.removeEventListener('error', done); resolve() }
  const timer = window.setTimeout(done, timeout)
  image.addEventListener('load', done, { once: true })
  image.addEventListener('error', done, { once: true })
})

const loadForSampling = (source: string) => new Promise<HTMLImageElement | null>((resolve) => {
  const image = new Image()
  const finish = () => { window.clearTimeout(timer); resolve(image.naturalWidth ? image : null) }
  const timer = window.setTimeout(() => resolve(null), 3_500)
  try {
    if (!source.startsWith('data:') && !source.startsWith('blob:') && new URL(source, window.location.href).origin !== window.location.origin) image.crossOrigin = 'anonymous'
  } catch { resolve(null); return }
  image.onload = finish
  image.onerror = finish
  image.src = source
})

const sampleImage = async (source: string, displayWeight: number, buckets: Map<string, Bucket>) => {
  const image = await loadForSampling(source)
  if (!image) return
  const canvas = document.createElement('canvas')
  canvas.width = SAMPLE_SIZE
  canvas.height = SAMPLE_SIZE
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return
  try {
    context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
    const pixels = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] < 90) continue
      addColor(buckets, pixels[index], pixels[index + 1], pixels[index + 2], displayWeight * pixels[index + 3] / 255)
    }
  } catch { /* El recurso sigue visible aunque su servidor no permita analizarlo. */ }
}

const backgroundImageUrl = (value: string) => value.match(/url\(["']?(.+?)["']?\)/)?.[1]

async function analyzeVisibleSpread(root: HTMLElement): Promise<AmbientRgb> {
  const scrapbook = root.querySelector<HTMLElement>('.scrapbook-spread, .scrapbook-single')
  if (!scrapbook) return EMPTY_PAGE
  const images = [...scrapbook.querySelectorAll<HTMLImageElement>('.album-paper img')]
  await Promise.all(images.map((image) => waitForImage(image)))
  const buckets = new Map<string, Bucket>()
  const sources = new Map<string, number>()
  images.forEach((image) => {
    if (!image.currentSrc && !image.src) return
    const bounds = image.getBoundingClientRect()
    sources.set(image.currentSrc || image.src, Math.max(sources.get(image.currentSrc || image.src) ?? 0, Math.min(5, Math.max(.55, bounds.width * bounds.height / 12_000))))
  })
  scrapbook.querySelectorAll<HTMLElement>('.album-setlist-track i').forEach((node) => {
    const source = backgroundImageUrl(getComputedStyle(node).backgroundImage)
    if (source) sources.set(source, Math.max(sources.get(source) ?? 0, .7))
  })
  scrapbook.querySelectorAll<HTMLElement>('.album-element, .album-setlist-track').forEach((node) => {
    const color = parseCssColor(getComputedStyle(node).backgroundColor)
    if (!color) return
    const bounds = node.getBoundingClientRect()
    addColor(buckets, ...color, Math.min(32, Math.max(2, bounds.width * bounds.height / 1_800)))
  })
  await Promise.all([...sources].map(([source, weight]) => sampleImage(source, weight, buckets)))
  const dominant = [...buckets.values()].sort((left, right) => right.score - left.score)[0]
  if (!dominant?.weight) return EMPTY_PAGE
  const color = [dominant.red / dominant.weight, dominant.green / dominant.weight, dominant.blue / dominant.weight].map((channel) => Math.round(channel)) as AmbientRgb
  const peak = Math.max(...color)
  if (peak < 150) return color.map((channel) => Math.round(channel * (150 / Math.max(peak, 1)))) as AmbientRgb
  return color
}

export function useImmersiveAlbumColor({ enabled, state, sceneKey, readerRef }: { enabled: boolean; state: BookState; sceneKey: string; readerRef: RefObject<HTMLElement | null> }) {
  const [color, setColor] = useState<AmbientRgb>(COVER_RED)
  useEffect(() => {
    if (!enabled) return
    if (state !== 'PAGE') return
    const root = readerRef.current
    if (!root) return
    let active = true
    let timer = 0
    let run = 0
    const analyze = () => {
      window.clearTimeout(timer)
      const currentRun = ++run
      timer = window.setTimeout(() => void analyzeVisibleSpread(root).then((next) => { if (active && currentRun === run) setColor(next) }).catch(() => undefined), 260)
    }
    const observer = new MutationObserver(analyze)
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'style', 'class'] })
    analyze()
    return () => { active = false; run += 1; window.clearTimeout(timer); observer.disconnect() }
  }, [enabled, readerRef, sceneKey, state])
  return color
}
