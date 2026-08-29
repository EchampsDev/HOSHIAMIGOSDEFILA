import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { constellationConnections, type ConstellationConnection } from '../landing/data/constellationConnections'
import { constellationPoints, type ConstellationPoint, type ConstellationPointGroup } from '../landing/data/constellationPoints'
import { CONSTELLATION_SCENE_STORAGE_KEY, defaultConstellationScene, readConstellationScene, type ConstellationScene } from '../landing/data/constellationScene'
import { constellationRepository, type ConstellationProgress } from './repositories/ConstellationRepository'
import { constellationReferenceRepository } from './repositories/ConstellationReferenceRepository'
import { useAdminSession } from '../access/useAdminSession'

const GROUPS: ConstellationPointGroup[] = ['hair', 'face', 'feature', 'body']
const STORAGE_KEY = 'brattypolitan.constellation-editor.v1'
const clamp = (value: number) => Math.min(Math.max(value, 0), 1)
const roundCoordinate = (value: number) => Number(clamp(value).toFixed(4))

type SavedProgress = ConstellationProgress

type DetectedPoint = {
  x: number
  y: number
  size: number
  score: number
}

type PanGesture = {
  pointerId: number
  startX: number
  startY: number
  scrollLeft: number
  scrollTop: number
  pointX: number
  pointY: number
  moved: boolean
}

type GroupMoveGesture = {
  pointerId: number
  start: { x: number; y: number }
  points: ConstellationPoint[]
}

type SelectionGesture = {
  pointerId: number
  start: { x: number; y: number }
  end: { x: number; y: number }
}

type FreeDrawGesture = {
  pointerId: number
  samples: { x: number; y: number }[]
}

type DetectionMatch = { pointId: string; detected: DetectedPoint }
type DetectionPlan = { matches: DetectionMatch[]; additions: DetectedPoint[] }

const stageDistance = (a: Pick<ConstellationPoint, 'x' | 'y'>, b: Pick<ConstellationPoint, 'x' | 'y'>) => Math.hypot((a.x - b.x) * .72, a.y - b.y)

function pointToSegmentDistance(point: DetectedPoint, from: ConstellationPoint, to: ConstellationPoint) {
  const px = point.x * .72
  const py = point.y
  const ax = from.x * .72
  const ay = from.y
  const bx = to.x * .72
  const by = to.y
  const dx = bx - ax
  const dy = by - ay
  const lengthSquared = dx * dx + dy * dy
  if (!lengthSquared) return Math.hypot(px - ax, py - ay)
  const projection = Math.min(Math.max(((px - ax) * dx + (py - ay) * dy) / lengthSquared, 0), 1)
  return Math.hypot(px - (ax + projection * dx), py - (ay + projection * dy))
}

function buildDetectionPlan(points: ConstellationPoint[], connections: ConstellationConnection[], detected: DetectedPoint[], matchRadius: number, maxAdditions: number): DetectionPlan {
  const positions = new Map(points.map((point) => [point.id, point]))
  const geometryDistance = (candidate: DetectedPoint) => {
    let closest = points.reduce((distance, point) => Math.min(distance, stageDistance(candidate, point)), Number.POSITIVE_INFINITY)
    connections.forEach((connection) => {
      const from = positions.get(connection.from)
      const to = positions.get(connection.to)
      if (from && to) closest = Math.min(closest, pointToSegmentDistance(candidate, from, to))
    })
    return closest
  }
  const eligible = detected.filter((candidate) => geometryDistance(candidate) <= matchRadius * 1.65)
  const pairs = eligible.flatMap((candidate) => points.map((point) => ({ candidate, point, distance: stageDistance(candidate, point) })))
    .filter((pair) => pair.distance <= matchRadius)
    .sort((a, b) => a.distance - b.distance)
  const usedPoints = new Set<string>()
  const usedCandidates = new Set<DetectedPoint>()
  const matches: DetectionMatch[] = []
  pairs.forEach(({ candidate, point }) => {
    if (usedPoints.has(point.id) || usedCandidates.has(candidate)) return
    usedPoints.add(point.id)
    usedCandidates.add(candidate)
    matches.push({ pointId: point.id, detected: candidate })
  })
  const additions = eligible
    .filter((candidate) => !usedCandidates.has(candidate) && geometryDistance(candidate) <= matchRadius)
    .filter((candidate) => matches.every((match) => stageDistance(candidate, match.detected) > .009))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxAdditions)
  return { matches, additions }
}

async function detectReferencePoints(source: string, sensitivity: number): Promise<DetectedPoint[]> {
  const image = new Image()
  image.src = source
  await image.decode()
  const scale = Math.min(1, 900 / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return []
  context.drawImage(image, 0, 0, width, height)
  const pixels = context.getImageData(0, 0, width, height).data
  const minimumBrightness = 95 - sensitivity * .6
  const minimumSaturation = Math.max(.06, (100 - sensitivity) / 300)
  const mask = new Uint8Array(width * height)
  for (let index = 0; index < mask.length; index += 1) {
    const offset = index * 4
    const red = pixels[offset]
    const green = pixels[offset + 1]
    const blue = pixels[offset + 2]
    const maximum = Math.max(red, green, blue)
    const minimum = Math.min(red, green, blue)
    const delta = maximum - minimum
    const saturation = maximum ? delta / maximum : 0
    let hue = 0
    if (delta) {
      if (maximum === red) hue = 60 * (((green - blue) / delta) % 6)
      else if (maximum === green) hue = 60 * ((blue - red) / delta + 2)
      else hue = 60 * ((red - green) / delta + 4)
      if (hue < 0) hue += 360
    }
    const isBlueCyan = hue >= 165 && hue <= 240 && blue + 20 >= green && green >= red + 3 && blue >= red + 8
    if (pixels[offset + 3] > 180 && maximum >= minimumBrightness && saturation >= minimumSaturation && isBlueCyan) mask[index] = 1
  }
  const queue = new Int32Array(width * height)
  const detected: DetectedPoint[] = []
  const maxBlob = Math.max(10, Math.min(width, height) * .035)
  for (let start = 0; start < mask.length; start += 1) {
    if (mask[start] !== 1) continue
    let head = 0
    let tail = 0
    queue[tail++] = start
    mask[start] = 2
    let area = 0
    let weightedX = 0
    let weightedY = 0
    let weightTotal = 0
    let minX = width
    let maxX = 0
    let minY = height
    let maxY = 0
    let peak = 0
    while (head < tail) {
      const index = queue[head++]
      const x = index % width
      const y = Math.floor(index / width)
      const offset = index * 4
      const red = pixels[offset]
      const green = pixels[offset + 1]
      const blue = pixels[offset + 2]
      const colorStrength = (blue - red) + (green - red) * .35
      const weight = Math.max(1, colorStrength)
      area += 1
      weightedX += x * weight
      weightedY += y * weight
      weightTotal += weight
      peak = Math.max(peak, Math.max(red, green, blue) + colorStrength)
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        if (!offsetX && !offsetY) continue
        const nextX = x + offsetX
        const nextY = y + offsetY
        if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue
        const next = nextY * width + nextX
        if (mask[next] === 1) { mask[next] = 2; queue[tail++] = next }
      }
    }
    const blobWidth = maxX - minX + 1
    const blobHeight = maxY - minY + 1
    if (area < 2 || area > 260 || blobWidth > maxBlob || blobHeight > maxBlob || !weightTotal) continue
    const imageX = (weightedX / weightTotal + .5) / width
    const imageY = (weightedY / weightTotal + .5) / height
    const imageAspect = width / height
    const stageAspect = 1000 / 1389
    const x = imageAspect > stageAspect ? imageX : (1 - imageAspect / stageAspect) / 2 + imageX * (imageAspect / stageAspect)
    const y = imageAspect > stageAspect ? (1 - stageAspect / imageAspect) / 2 + imageY * (stageAspect / imageAspect) : imageY
    detected.push({ x: roundCoordinate(x), y: roundCoordinate(y), size: Math.min(3.6, Math.max(1.2, 1 + Math.sqrt(area) / 4)), score: peak + Math.sqrt(area) * 4 })
  }
  return detected.sort((a, b) => b.score - a.score)
}

function readSavedProgress(): SavedProgress | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    if (!value) return null
    const parsed = JSON.parse(value) as Partial<SavedProgress>
    if (parsed.version !== 1 || !Array.isArray(parsed.points) || !Array.isArray(parsed.connections) || typeof parsed.savedAt !== 'string') return null
    return parsed as SavedProgress
  } catch {
    return null
  }
}

function createPointId(points: ConstellationPoint[]) {
  let index = points.length + 1
  while (points.some((point) => point.id === `point-${index}`)) index += 1
  return `point-${index}`
}

function pointFile(points: ConstellationPoint[]) {
  const rows = points.map((point) => {
    const optional = [
      point.brightness === undefined ? '' : `, brightness: ${point.brightness}`,
      point.delay === undefined ? '' : `, delay: ${point.delay}`,
    ].join('')
    return `  { id: ${JSON.stringify(point.id)}, x: ${point.x}, y: ${point.y}, size: ${point.size}${optional}, group: ${JSON.stringify(point.group)} },`
  })
  return `export type ConstellationPointGroup = 'hair' | 'face' | 'feature' | 'body'\n\nexport type ConstellationPoint = {\n  id: string\n  x: number\n  y: number\n  size: number\n  brightness?: number\n  delay?: number\n  group: ConstellationPointGroup\n}\n\n// Coordenadas normalizadas exportadas desde /constellation-editor.\nexport const constellationPoints: ConstellationPoint[] = [\n${rows.join('\n')}\n]\n`
}

function connectionFile(connections: ConstellationConnection[]) {
  const rows = connections.map((connection) => {
    const optional = [
      connection.opacity === undefined ? '' : `, opacity: ${connection.opacity}`,
      connection.delay === undefined ? '' : `, delay: ${connection.delay}`,
    ].join('')
    return `  { from: ${JSON.stringify(connection.from)}, to: ${JSON.stringify(connection.to)}${optional} },`
  })
  return `export type ConstellationConnection = {\n  from: string\n  to: string\n  opacity?: number\n  delay?: number\n}\n\n// Conexiones exportadas desde /constellation-editor.\nexport const constellationConnections: ConstellationConnection[] = [\n${rows.join('\n')}\n]\n`
}

function downloadTypeScript(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/typescript;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function coordinateFile(points: ConstellationPoint[], connections: ConstellationConnection[], scene: ConstellationScene) {
  const ids = new Map(points.map((point, index) => [point.id, String(index + 1).padStart(4, '0')]))
  const rows = points.map((point, index) => `${String(index + 1).padStart(4, '0')} | ${point.x.toFixed(6)} | ${point.y.toFixed(6)} | ${Math.round((point.brightness ?? .9) * 255)} | ${point.group} | ${point.size}`)
  const links = connections.flatMap((connection) => {
    const from = ids.get(connection.from); const to = ids.get(connection.to)
    return from && to ? [`${from} | ${to} | ${connection.opacity ?? .28} | ${connection.delay ?? 0}`] : []
  })
  return `COORDENADAS DE LA SILUETA - BRATTYPOLITAN EXPERIENCE\nFORMATO: ID | X_norm | Y_norm | brillo_0_255 | grupo | tamano\nGRUPOS: hair/cabello, face/rostro, feature/facciones, body/cuerpo\n\nPUNTOS\n${rows.join('\n')}\n\nCONEXIONES\nFORMATO: desde | hasta | opacidad | retraso\n${links.join('\n')}\n\nESCENA\nreferenceX=${scene.referenceX}\nreferenceY=${scene.referenceY}\nstarX=${scene.starX}\nstarY=${scene.starY}\nstarScale=${scene.starScale}\nstarIntensity=${scene.starIntensity}\n`
}

type ImportedCoordinates = { points: ConstellationPoint[]; connections: ConstellationConnection[]; scene?: ConstellationScene }

function parseCoordinateFile(source: string): ImportedCoordinates {
  const points: ConstellationPoint[] = []
  const connections: ConstellationConnection[] = []
  const importedIds = new Map<string, string>()
  let inConnections = false
  const sceneValues: Partial<ConstellationScene> = {}
  source.split(/\r?\n/).forEach((line) => {
    if (/^\s*CONEXIONES\s*$/i.test(line)) { inConnections = true; return }
    const sceneMatch = line.match(/^\s*(reference[XY]|starX|starY|starScale|starIntensity)\s*=\s*([\d.]+)\s*$/i)
    if (sceneMatch) {
      sceneValues[sceneMatch[1] as keyof ConstellationScene] = Number(sceneMatch[2])
      return
    }
    if (inConnections) {
      const match = line.match(/^\s*([^|\s]+)\s*\|\s*([^|\s]+)\s*\|\s*([\d.]+)(?:\s*\|\s*([\d.]+))?\s*$/)
      if (match) connections.push({ from: match[1], to: match[2], opacity: Number(match[3]), delay: Number(match[4] ?? 0) })
      return
    }
    const raster = line.match(/^\s*(\d+)\s*\|\s*\d+(?:\.\d+)?\s*\|\s*\d+(?:\.\d+)?\s*\|\s*([01](?:\.\d+)?)\s*\|\s*([01](?:\.\d+)?)\s*\|\s*(\d{1,3})(?:\s*\|\s*(hair|face|feature|body|cabello|rostro|facciones|cuerpo))?(?:\s*\|\s*([0-9](?:\.\d+)?))?\s*$/i)
    const portable = line.match(/^\s*(\d+)\s*\|\s*([01](?:\.\d+)?)\s*\|\s*([01](?:\.\d+)?)\s*\|\s*(\d{1,3})(?:\s*\|\s*(hair|face|feature|body|cabello|rostro|facciones|cuerpo))?(?:\s*\|\s*([0-9](?:\.\d+)?))?\s*$/i)
    const match = raster ?? portable
    if (!match) return
    const x = Number(match[2]); const y = Number(match[3]); const brightness = Number(match[4])
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(brightness)) return
    const id = `import-${match[1]}`
    importedIds.set(match[1], id)
    const importedGroup = match[5]?.toLowerCase()
    const group: ConstellationPointGroup = importedGroup === 'hair' || importedGroup === 'cabello' ? 'hair'
      : importedGroup === 'face' || importedGroup === 'rostro' ? 'face'
        : importedGroup === 'body' || importedGroup === 'cuerpo' ? 'body' : 'feature'
    const specifiedSize = Number(match[6])
    const size = Number.isFinite(specifiedSize) ? Math.min(Math.max(specifiedSize, .7), 4.2) : Number((1 + brightness / 255 * 2.2).toFixed(1))
    points.push({ id, x: roundCoordinate(x), y: roundCoordinate(y), size, brightness: Number((brightness / 255).toFixed(2)), delay: 0, group })
  })
  if (!points.length) throw new Error('El archivo no contiene filas de coordenadas válidas.')
  const validConnections = connections.flatMap((connection) => {
    const from = importedIds.get(connection.from); const to = importedIds.get(connection.to)
    return from && to ? [{ ...connection, from, to }] : []
  })
  const scene = Object.keys(sceneValues).length ? { ...defaultConstellationScene, ...sceneValues } : undefined
  return { points, connections: validConnections, scene }
}

function thinPoints(points: ConstellationPoint[], target: number) {
  if (points.length <= target) return points.map((point) => ({ ...point }))
  let best = points
  let low = 0
  let high = .12
  for (let pass = 0; pass < 14; pass += 1) {
    const minimumDistance = (low + high) / 2
    const kept: ConstellationPoint[] = []
    points.forEach((point) => {
      if (kept.every((candidate) => stageDistance(point, candidate) >= minimumDistance)) kept.push(point)
    })
    if (Math.abs(kept.length - target) < Math.abs(best.length - target)) best = kept
    if (kept.length > target) low = minimumDistance
    else high = minimumDistance
  }
  return best.map((point) => ({ ...point }))
}

function buildAutomaticConnections(points: ConstellationPoint[], maximumDistance: number, maximumNeighbors: number) {
  const links = new Map<string, ConstellationConnection>()
  points.forEach((from) => {
    const neighbors = points
      .filter((to) => to.id !== from.id)
      .map((to) => ({ to, distance: stageDistance(from, to) }))
      .filter((candidate) => candidate.distance <= maximumDistance)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maximumNeighbors)
    neighbors.forEach(({ to }) => {
      const [first, second] = [from.id, to.id].sort()
      links.set(`${first}:${second}`, { from: first, to: second, opacity: .34, delay: 0 })
    })
  })
  return [...links.values()]
}

export function ConstellationEditorPage() {
  const session = useAdminSession()
  const [points, setPoints] = useState<ConstellationPoint[]>(() => constellationPoints.map((point) => ({ ...point })))
  const [connections, setConnections] = useState<ConstellationConnection[]>(() => constellationConnections.map((connection) => ({ ...connection })))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [newPointGroup, setNewPointGroup] = useState<ConstellationPointGroup>('feature')
  const [connectionSourceId, setConnectionSourceId] = useState<string | null>(null)
  const [referenceImage, setReferenceImage] = useState<string | null>(null)
  const [referenceFile, setReferenceFile] = useState<File | null>(null)
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | undefined>()
  const [scene, setScene] = useState<ConstellationScene>(readConstellationScene)
  const [zoom, setZoom] = useState(1)
  const [savedProgress, setSavedProgress] = useState<SavedProgress | null>(readSavedProgress)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [detectionSensitivity, setDetectionSensitivity] = useState(72)
  const [detectionRadius, setDetectionRadius] = useState(.055)
  const [maximumAdditions, setMaximumAdditions] = useState(24)
  const [detectedPoints, setDetectedPoints] = useState<DetectedPoint[]>([])
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectionMessage, setDetectionMessage] = useState<string | null>(null)
  const [detectionUndo, setDetectionUndo] = useState<{ points: ConstellationPoint[]; connections: ConstellationConnection[] } | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [isMovingAll, setIsMovingAll] = useState(false)
  const [isSelectingMultiple, setIsSelectingMultiple] = useState(false)
  const [selectionBox, setSelectionBox] = useState<SelectionGesture | null>(null)
  const [isFreeDrawing, setIsFreeDrawing] = useState(false)
  const [freeDrawPreview, setFreeDrawPreview] = useState<{ x: number; y: number }[]>([])
  const [drawAnchorId, setDrawAnchorId] = useState<string | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [simplifyTarget, setSimplifyTarget] = useState(320)
  const [autoConnectionsEnabled, setAutoConnectionsEnabled] = useState(false)
  const [autoConnectionDistance, setAutoConnectionDistance] = useState(.035)
  const [autoConnectionNeighbors, setAutoConnectionNeighbors] = useState(2)
  const draggingId = useRef<string | null>(null)
  const panGesture = useRef<PanGesture | null>(null)
  const groupMoveGesture = useRef<GroupMoveGesture | null>(null)
  const selectionGesture = useRef<SelectionGesture | null>(null)
  const freeDrawGesture = useRef<FreeDrawGesture | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!constellationRepository.usesFirebase) return
    return constellationRepository.subscribe((progress) => {
      if (!progress) return
      setPoints(progress.points.map((point) => ({ ...point })))
      setConnections(progress.connections.map((connection) => ({ ...connection })))
      setScene({ ...defaultConstellationScene, ...progress.scene })
      setReferenceImageUrl(progress.referenceImageUrl)
      setSavedProgress(progress)
    }, () => setSaveMessage('No fue posible leer la silueta guardada en Firebase.'))
  }, [])

  const selectedPoint = points.find((point) => point.id === selectedId) ?? null
  const selectedConnections = useMemo(() => selectedId ? connections.flatMap((connection) => {
    if (connection.from === selectedId) return [{ neighborId: connection.to }]
    if (connection.to === selectedId) return [{ neighborId: connection.from }]
    return []
  }) : [], [connections, selectedId])
  const positions = useMemo(() => new Map(points.map((point) => [point.id, point])), [points])
  const progressSnapshot = useMemo(() => JSON.stringify({ points, connections, scene }), [points, connections, scene])
  const savedSnapshot = useMemo(() => savedProgress ? JSON.stringify({ points: savedProgress.points, connections: savedProgress.connections, scene: savedProgress.scene ?? defaultConstellationScene }) : null, [savedProgress])
  const hasUnsavedChanges = progressSnapshot !== savedSnapshot
  const detectionPlan = useMemo(() => buildDetectionPlan(points, connections, detectedPoints, detectionRadius, maximumAdditions), [points, connections, detectedPoints, detectionRadius, maximumAdditions])
  const previewMatches = useMemo(() => new Set(detectionPlan.matches.map((match) => match.detected)), [detectionPlan.matches])
  const previewAdditions = useMemo(() => new Set(detectionPlan.additions), [detectionPlan.additions])

  const normalizedPosition = (event: ReactPointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    return {
      x: roundCoordinate((event.clientX - bounds.left) / bounds.width),
      y: roundCoordinate((event.clientY - bounds.top) / bounds.height),
    }
  }

  const updatePoint = (id: string, patch: Partial<ConstellationPoint>) => {
    setPoints((current) => current.map((point) => point.id === id ? { ...point, ...patch } : point))
  }

  const updateScene = (patch: Partial<ConstellationScene>) => setScene((current) => ({ ...current, ...patch }))

  const deleteSelectedPoint = useCallback(() => {
    const ids = selectedIds.length ? new Set(selectedIds) : selectedId ? new Set([selectedId]) : null
    if (!ids?.size) return
    setPoints((current) => current.filter((point) => !ids.has(point.id)))
    setConnections((current) => current.filter((connection) => !ids.has(connection.from) && !ids.has(connection.to)))
    setConnectionSourceId((current) => current && ids.has(current) ? null : current)
    setSelectedId(null)
    setSelectedIds([])
  }, [selectedId, selectedIds])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      const target = event.target as HTMLElement | null
      if (target?.matches('input, select, textarea')) return
      event.preventDefault()
      deleteSelectedPoint()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteSelectedPoint])

  const addConnection = (from: string, to: string) => {
    if (from === to) return
    const alreadyExists = connections.some((connection) =>
      (connection.from === from && connection.to === to) || (connection.from === to && connection.to === from),
    )
    if (!alreadyExists) setConnections((current) => [...current, { from, to, opacity: .28, delay: 0 }])
  }

  const addPointAt = (position: { x: number; y: number }) => {
    const point: ConstellationPoint = {
      id: createPointId(points),
      ...position,
      size: 1.8,
      brightness: .9,
      delay: 0,
      group: newPointGroup,
    }
    setPoints((current) => [...current, point])
    if (autoConnectionsEnabled) {
      const nearest = points.reduce<ConstellationPoint | null>((closest, candidate) => !closest || stageDistance(point, candidate) < stageDistance(point, closest) ? candidate : closest, null)
      if (nearest && stageDistance(point, nearest) <= autoConnectionDistance) addConnection(point.id, nearest.id)
    }
    setSelectedId(point.id)
    setSelectedIds([point.id])
    setConnectionSourceId(null)
  }

  const createFreeDrawPoints = (samples: { x: number; y: number }[]) => {
    const spaced = samples.reduce<{ x: number; y: number }[]>((kept, sample) => {
      if (!kept.length || Math.hypot(sample.x - kept[kept.length - 1].x, sample.y - kept[kept.length - 1].y) >= .014) kept.push(sample)
      return kept
    }, [])
    if (!spaced.length) return
    const created = spaced.map((position, index) => ({
      id: createPointId([...points, ...spaced.slice(0, index).map((_, inner) => ({ id: `draw-${inner}` } as ConstellationPoint))]),
      ...position,
      size: 1.55,
      brightness: .9,
      delay: 0,
      group: newPointGroup,
    })) satisfies ConstellationPoint[]
    setPoints((current) => [...current, ...created])
    setConnections((current) => {
      const next = [...current]
      const link = (from: string, to: string) => {
        if (from !== to && !next.some((connection) => (connection.from === from && connection.to === to) || (connection.from === to && connection.to === from))) next.push({ from, to, opacity: .34, delay: 0 })
      }
      if (drawAnchorId) link(drawAnchorId, created[0].id)
      created.slice(1).forEach((point, index) => link(created[index].id, point.id))
      return next
    })
    const last = created[created.length - 1]
    setDrawAnchorId(last.id)
    setSelectedId(last.id)
    setSelectedIds(created.map((point) => point.id))
  }

  const handleSurfacePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.target !== event.currentTarget) return
    event.preventDefault()
    const position = normalizedPosition(event)
    if (isSelectingMultiple) {
      const gesture = { pointerId: event.pointerId, start: position, end: position }
      selectionGesture.current = gesture
      setSelectionBox(gesture)
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }
    if (isFreeDrawing) {
      freeDrawGesture.current = { pointerId: event.pointerId, samples: [position] }
      setFreeDrawPreview([position])
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }
    if (isMovingAll) {
      groupMoveGesture.current = { pointerId: event.pointerId, start: position, points: points.map((point) => ({ ...point })) }
      setSelectedId(null)
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }
    const viewport = viewportRef.current
    panGesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: viewport?.scrollLeft ?? 0,
      scrollTop: viewport?.scrollTop ?? 0,
      pointX: position.x,
      pointY: position.y,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointPointerDown = (event: ReactPointerEvent<SVGCircleElement>, id: string) => {
    event.preventDefault()
    event.stopPropagation()
    if (isFreeDrawing) {
      setDrawAnchorId(id)
      setSelectedId(id)
      setSelectedIds([id])
      return
    }
    if (connectionSourceId && connectionSourceId !== id) {
      addConnection(connectionSourceId, id)
      setConnectionSourceId(null)
      setSelectedId(id)
      setSelectedIds([id])
      return
    }
    draggingId.current = id
    setSelectedId(id)
    setSelectedIds([id])
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (draggingId.current) {
      updatePoint(draggingId.current, normalizedPosition(event))
      return
    }
    const groupGesture = groupMoveGesture.current
    if (groupGesture?.pointerId === event.pointerId) {
      const position = normalizedPosition(event)
      const requestedX = position.x - groupGesture.start.x
      const requestedY = position.y - groupGesture.start.y
      const minX = Math.min(...groupGesture.points.map((point) => point.x)
      )
      const maxX = Math.max(...groupGesture.points.map((point) => point.x))
      const minY = Math.min(...groupGesture.points.map((point) => point.y))
      const maxY = Math.max(...groupGesture.points.map((point) => point.y))
      const deltaX = Math.min(Math.max(requestedX, -minX), 1 - maxX)
      const deltaY = Math.min(Math.max(requestedY, -minY), 1 - maxY)
      setPoints(groupGesture.points.map((point) => ({ ...point, x: roundCoordinate(point.x + deltaX), y: roundCoordinate(point.y + deltaY) })))
      return
    }
    const selection = selectionGesture.current
    if (selection?.pointerId === event.pointerId) {
      const next = { ...selection, end: normalizedPosition(event) }
      selectionGesture.current = next
      setSelectionBox(next)
      return
    }
    const freeDraw = freeDrawGesture.current
    if (freeDraw?.pointerId === event.pointerId) {
      const position = normalizedPosition(event)
      const previous = freeDraw.samples[freeDraw.samples.length - 1]
      if (!previous || Math.hypot(position.x - previous.x, position.y - previous.y) >= .004) {
        freeDraw.samples.push(position)
        setFreeDrawPreview([...freeDraw.samples])
      }
      return
    }
    const gesture = panGesture.current
    const viewport = viewportRef.current
    if (!gesture || gesture.pointerId !== event.pointerId || !viewport) return
    const movementX = event.clientX - gesture.startX
    const movementY = event.clientY - gesture.startY
    if (!gesture.moved && Math.hypot(movementX, movementY) >= 5) {
      gesture.moved = true
      setIsPanning(true)
    }
    if (!gesture.moved) return
    event.preventDefault()
    viewport.scrollLeft = gesture.scrollLeft - movementX
    viewport.scrollTop = gesture.scrollTop - movementY
  }

  const finishPointerGesture = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (draggingId.current) {
      draggingId.current = null
      return
    }
    if (groupMoveGesture.current?.pointerId === event.pointerId) {
      groupMoveGesture.current = null
      return
    }
    const selection = selectionGesture.current
    if (selection?.pointerId === event.pointerId) {
      const end = normalizedPosition(event)
      const left = Math.min(selection.start.x, end.x)
      const right = Math.max(selection.start.x, end.x)
      const top = Math.min(selection.start.y, end.y)
      const bottom = Math.max(selection.start.y, end.y)
      const ids = points.filter((point) => point.x >= left && point.x <= right && point.y >= top && point.y <= bottom).map((point) => point.id)
      setSelectedIds(ids)
      setSelectedId(ids[0] ?? null)
      selectionGesture.current = null
      setSelectionBox(null)
      return
    }
    const freeDraw = freeDrawGesture.current
    if (freeDraw?.pointerId === event.pointerId) {
      const end = normalizedPosition(event)
      const last = freeDraw.samples[freeDraw.samples.length - 1]
      if (!last || Math.hypot(end.x - last.x, end.y - last.y) >= .004) freeDraw.samples.push(end)
      createFreeDrawPoints(freeDraw.samples)
      freeDrawGesture.current = null
      setFreeDrawPreview([])
      return
    }
    const gesture = panGesture.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    if (!gesture.moved) addPointAt({ x: gesture.pointX, y: gesture.pointY })
    panGesture.current = null
    setIsPanning(false)
  }

  const cancelPointerGesture = () => {
    draggingId.current = null
    panGesture.current = null
    groupMoveGesture.current = null
    selectionGesture.current = null
    freeDrawGesture.current = null
    setSelectionBox(null)
    setFreeDrawPreview([])
    setIsPanning(false)
  }

  const handleReferenceImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      setReferenceImage(typeof reader.result === 'string' ? reader.result : null)
      setDetectedPoints([])
      setDetectionMessage(null)
    }, { once: true })
    reader.readAsDataURL(file)
  }

  const analyzeReference = async () => {
    if (!referenceImage) return
    setIsDetecting(true)
    setDetectionMessage(null)
    try {
      const candidates = await detectReferencePoints(referenceImage, detectionSensitivity)
      setDetectedPoints(candidates)
      setDetectionMessage(candidates.length ? `${candidates.length} puntos azules o cian detectados; revisa la previsualización.` : 'No se detectaron puntos azules o cian con esta sensibilidad.')
    } catch {
      setDetectionMessage('No fue posible analizar esta imagen.')
    } finally {
      setIsDetecting(false)
    }
  }

  const applyDetection = () => {
    if (!detectionPlan.matches.length && !detectionPlan.additions.length) return
    setDetectionUndo({
      points: points.map((point) => ({ ...point })),
      connections: connections.map((connection) => ({ ...connection })),
    })
    const matchPositions = new Map(detectionPlan.matches.map((match) => [match.pointId, match.detected]))
    const nextPoints = points.map((point) => {
      const detected = matchPositions.get(point.id)
      return detected ? { ...point, x: detected.x, y: detected.y } : { ...point }
    })
    const nextConnections = connections.map((connection) => ({ ...connection }))
    detectionPlan.additions.forEach((detected) => {
      const nearest = nextPoints.reduce<ConstellationPoint | null>((closest, point) => !closest || stageDistance(detected, point) < stageDistance(detected, closest) ? point : closest, null)
      const newPoint: ConstellationPoint = {
        id: createPointId(nextPoints),
        x: detected.x,
        y: detected.y,
        size: Number(detected.size.toFixed(1)),
        brightness: .9,
        delay: 0,
        group: nearest?.group ?? 'feature',
      }
      const currentPositions = new Map(nextPoints.map((point) => [point.id, point]))
      let nearestConnectionIndex = -1
      let nearestConnectionDistance = Number.POSITIVE_INFINITY
      nextConnections.forEach((connection, index) => {
        const from = currentPositions.get(connection.from)
        const to = currentPositions.get(connection.to)
        if (!from || !to) return
        const distance = pointToSegmentDistance(detected, from, to)
        if (distance < nearestConnectionDistance) { nearestConnectionDistance = distance; nearestConnectionIndex = index }
      })
      nextPoints.push(newPoint)
      if (nearestConnectionIndex >= 0 && nearestConnectionDistance <= detectionRadius) {
        const connection = nextConnections[nearestConnectionIndex]
        nextConnections.splice(nearestConnectionIndex, 1,
          { ...connection, to: newPoint.id },
          { ...connection, from: newPoint.id },
        )
      } else if (nearest) {
        nextConnections.push({ from: nearest.id, to: newPoint.id, opacity: .28, delay: 0 })
      }
    })
    setPoints(nextPoints)
    setConnections(nextConnections)
    setDetectedPoints([])
    setSelectedId(null)
    setConnectionSourceId(null)
    setDetectionMessage(`Aplicado: ${detectionPlan.matches.length} puntos ajustados y ${detectionPlan.additions.length} añadidos.`)
  }

  const undoDetection = () => {
    if (!detectionUndo) return
    setPoints(detectionUndo.points.map((point) => ({ ...point })))
    setConnections(detectionUndo.connections.map((connection) => ({ ...connection })))
    setDetectionUndo(null)
    setDetectionMessage('Último ajuste automático deshecho.')
  }

  const saveProgress = async () => {
    const progress: SavedProgress = {
      version: 1,
      savedAt: new Date().toISOString(),
      points: points.map((point) => ({ ...point })),
      connections: connections.map((connection) => ({ ...connection })),
      scene,
      referenceImageUrl,
    }
    try {
      if (referenceFile && constellationReferenceRepository.usesFirebase) progress.referenceImageUrl = await constellationReferenceRepository.upload(referenceFile)
      if (constellationRepository.usesFirebase) await constellationRepository.save(progress)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
      window.localStorage.setItem(CONSTELLATION_SCENE_STORAGE_KEY, JSON.stringify(scene))
      setSavedProgress(progress)
      setReferenceImageUrl(progress.referenceImageUrl)
      setReferenceFile(null)
      setSaveMessage(constellationRepository.usesFirebase ? 'Silueta guardada en Firebase.' : 'Progreso guardado en este navegador.')
    } catch {
      setSaveMessage(constellationRepository.usesFirebase ? 'No se pudo guardar. Inicia sesión con la cuenta administradora y revisa sus permisos.' : 'No fue posible guardar el progreso en este navegador.')
    }
  }

  const restoreProgress = () => {
    if (!savedProgress) return
    setPoints(savedProgress.points.map((point) => ({ ...point })))
    setConnections(savedProgress.connections.map((connection) => ({ ...connection })))
    const restoredScene = { ...defaultConstellationScene, ...savedProgress.scene }
    setScene(restoredScene)
    window.localStorage.setItem(CONSTELLATION_SCENE_STORAGE_KEY, JSON.stringify(restoredScene))
    setSelectedId(null)
    setConnectionSourceId(null)
    setSaveMessage('Último progreso restaurado.')
  }

  const clearSavedProgress = () => {
    if (!window.confirm('¿Eliminar el progreso guardado de este navegador?')) return
    window.localStorage.removeItem(STORAGE_KEY)
    setSavedProgress(null)
    setSaveMessage('Progreso guardado eliminado. El lienzo actual no cambió.')
  }

  const updateZoom = (nextZoom: number) => {
    const viewport = viewportRef.current
    const previousZoom = zoom
    const centerX = viewport ? viewport.scrollLeft + viewport.clientWidth / 2 : 0
    const centerY = viewport ? viewport.scrollTop + viewport.clientHeight / 2 : 0
    const normalizedZoom = Math.min(Math.max(nextZoom, 1), 4)
    setZoom(normalizedZoom)
    window.requestAnimationFrame(() => {
      if (!viewport) return
      const ratio = normalizedZoom / previousZoom
      viewport.scrollLeft = centerX * ratio - viewport.clientWidth / 2
      viewport.scrollTop = centerY * ratio - viewport.clientHeight / 2
    })
  }

  const importCoordinates = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const imported = parseCoordinateFile(String(reader.result ?? ''))
        if (!window.confirm(`Se reemplazarán ${points.length.toLocaleString('es-MX')} puntos por ${imported.points.length.toLocaleString('es-MX')} puntos del archivo. ¿Continuar?`)) return
        const importedConnections = imported.connections.length || !autoConnectionsEnabled ? imported.connections : buildAutomaticConnections(imported.points, autoConnectionDistance, autoConnectionNeighbors)
        setPoints(imported.points); setConnections(importedConnections); setScene(imported.scene ?? scene); setSelectedId(null); setConnectionSourceId(null)
        setImportMessage(`${imported.points.length.toLocaleString('es-MX')} puntos importados${importedConnections.length ? ` y ${importedConnections.length.toLocaleString('es-MX')} conexiones creadas` : '. El archivo no incluye conexiones'}.`)
      } catch (error) { setImportMessage(error instanceof Error ? error.message : 'No fue posible leer el archivo.') }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const simplifyImportedPoints = () => {
    const nextPoints = thinPoints(points, simplifyTarget)
    const allowedIds = new Set(nextPoints.map((point) => point.id))
    const remainingConnections = connections.filter((connection) => allowedIds.has(connection.from) && allowedIds.has(connection.to))
    setPoints(nextPoints)
    setConnections(autoConnectionsEnabled ? buildAutomaticConnections(nextPoints, autoConnectionDistance, autoConnectionNeighbors) : remainingConnections)
    setSelectedId(null)
    setConnectionSourceId(null)
    setImportMessage(`Silueta simplificada: ${points.length.toLocaleString('es-MX')} → ${nextPoints.length.toLocaleString('es-MX')} puntos.`)
  }

  const generateAutomaticConnections = () => {
    const nextConnections = buildAutomaticConnections(points, autoConnectionDistance, autoConnectionNeighbors)
    setConnections(nextConnections)
    setImportMessage(`${nextConnections.length.toLocaleString('es-MX')} conexiones automáticas creadas.`)
  }

  return <main className="constellation-editor-page">
    <header className="editor-header">
      <div><p>HERRAMIENTA INTERNA · DESARROLLO</p><h1>Constellation Editor</h1></div>
      <div>{constellationRepository.usesFirebase && (session.user ? <button type="button" onClick={() => void session.signOut()}>Cerrar sesión</button> : <button type="button" onClick={() => void session.signIn()}>Iniciar sesión con Google</button>)}<Link to="/">Volver al landing</Link></div>
    </header>

    <div className="editor-layout">
      <aside className="editor-panel">
        <section>
          <h2>Referencia del landing</h2>
          <p className="editor-help">Añade una imagen como referencia visual del landing. Se publicará al guardar con la cuenta administradora.</p>
          <label>Altura <output>{Math.round(scene.referenceY)}%</output><input type="range" min="20" max="80" step="1" value={scene.referenceY} onChange={(event) => updateScene({ referenceY: Number(event.target.value) })} /></label>
          <label>Posición horizontal <output>{Math.round(scene.referenceX)}%</output><input type="range" min="20" max="80" step="1" value={scene.referenceX} onChange={(event) => updateScene({ referenceX: Number(event.target.value) })} /></label>
          <div className="editor-detection-divider" />
          <h3>Estrella roja</h3>
          <label>Altura <output>{Math.round(scene.starY)}%</output><input type="range" min="5" max="85" step="1" value={scene.starY} onChange={(event) => updateScene({ starY: Number(event.target.value) })} /></label>
          <label>Posición horizontal <output>{Math.round(scene.starX)}%</output><input type="range" min="5" max="95" step="1" value={scene.starX} onChange={(event) => updateScene({ starX: Number(event.target.value) })} /></label>
          <label>Escala <output>{scene.starScale.toFixed(1)}×</output><input type="range" min=".4" max="2.4" step=".1" value={scene.starScale} onChange={(event) => updateScene({ starScale: Number(event.target.value) })} /></label>
          <label>Intensidad <output>{Math.round(scene.starIntensity * 100)}%</output><input type="range" min=".3" max="2" step=".1" value={scene.starIntensity} onChange={(event) => updateScene({ starIntensity: Number(event.target.value) })} /></label>
          <div className="editor-detection-divider" />
          <h3>Referencia para trazar</h3>
          <label className="editor-file-input">Cargar imagen<input type="file" accept="image/*" onChange={handleReferenceImage} /></label>
          {referenceImage && <button type="button" className="editor-text-button" onClick={() => { setReferenceImage(null); setReferenceFile(null); setDetectedPoints([]); setDetectionMessage(null) }}>Quitar referencia</button>}
          <div className="editor-detection-divider" />
          <h3>Detección asistida</h3>
          <label>Sensibilidad <output>{detectionSensitivity}%</output><input type="range" min="50" max="95" step="1" value={detectionSensitivity} onChange={(event) => setDetectionSensitivity(Number(event.target.value))} /></label>
          <label>Radio de ajuste <output>{Math.round(detectionRadius * 100)}%</output><input type="range" min=".02" max=".1" step=".005" value={detectionRadius} onChange={(event) => setDetectionRadius(Number(event.target.value))} /></label>
          <label>Máximo de puntos nuevos <output>{maximumAdditions}</output><input type="range" min="0" max="60" step="1" value={maximumAdditions} onChange={(event) => setMaximumAdditions(Number(event.target.value))} /></label>
          <p className="editor-help">Sólo analiza puntos azules o cian; ignora blancos, rojos, verdes y otros colores.</p>
          <button type="button" className="editor-detect-button" onClick={analyzeReference} disabled={!referenceImage || isDetecting}>{isDetecting ? 'Analizando imagen…' : 'Detectar puntos azul/cian'}</button>
          {detectedPoints.length > 0 && <div className="editor-detection-result">
            <span><i className="is-match" />{detectionPlan.matches.length} para ajustar</span>
            <span><i className="is-new" />{detectionPlan.additions.length} para añadir</span>
            <button type="button" className="editor-apply-detection" onClick={applyDetection} disabled={!detectionPlan.matches.length && !detectionPlan.additions.length}>Aplicar previsualización</button>
            <button type="button" className="editor-text-button" onClick={() => { setDetectedPoints([]); setDetectionMessage(null) }}>Cancelar previsualización</button>
          </div>}
          {detectionUndo && <button type="button" className="editor-button" onClick={undoDetection}>Deshacer último ajuste automático</button>}
          {detectionMessage && <p className="editor-detection-message" role="status">{detectionMessage}</p>}
        </section>

        <section>
          <h2>Punto seleccionado</h2>
          {selectedPoint ? <>
            <code>{selectedPoint.id}</code>
            <div className="editor-coordinate-row"><span>x {selectedPoint.x.toFixed(4)}</span><span>y {selectedPoint.y.toFixed(4)}</span></div>
            <label>Tamaño <output>{selectedPoint.size.toFixed(1)}</output><input type="range" min=".6" max="5" step=".1" value={selectedPoint.size} onChange={(event) => updatePoint(selectedPoint.id, { size: Number(event.target.value) })} /></label>
            <label>Grupo<select value={selectedPoint.group} onChange={(event) => { const group = event.target.value as ConstellationPointGroup; updatePoint(selectedPoint.id, { group }); setNewPointGroup(group) }}>{GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}</select></label>
            <p className="editor-help">Los puntos nuevos se crearán en este grupo: <b>{newPointGroup}</b>.</p>
            <button type="button" className={connectionSourceId === selectedPoint.id ? 'editor-button is-active' : 'editor-button'} onClick={() => setConnectionSourceId((current) => current === selectedPoint.id ? null : selectedPoint.id)}>{connectionSourceId === selectedPoint.id ? 'Selecciona el destino…' : 'Conectar con otro punto'}</button>
            {selectedConnections.length ? <div className="editor-disconnect-list">
              <p>Conectado con</p>
              {selectedConnections.map(({ neighborId }) => <button type="button" key={neighborId} aria-label={`Desconectar de ${neighborId}`} onClick={() => setConnections((current) => current.filter((connection) => !((connection.from === selectedPoint.id && connection.to === neighborId) || (connection.to === selectedPoint.id && connection.from === neighborId))))}>× <span>{neighborId}</span></button>)}
              {selectedConnections.length > 1 && <button type="button" className="disconnect-all" onClick={() => setConnections((current) => current.filter((connection) => connection.from !== selectedPoint.id && connection.to !== selectedPoint.id))}>Desconectar de todos ({selectedConnections.length})</button>}
            </div> : <p className="editor-help">Este punto no tiene conexiones.</p>}
            <button type="button" className="editor-danger-button" onClick={deleteSelectedPoint}>{selectedIds.length > 1 ? `Eliminar ${selectedIds.length} puntos` : 'Eliminar punto'}</button>
          </> : <p className="editor-help">Selecciona un punto para editarlo. Haz clic sobre un espacio vacío para crear uno nuevo.</p>}
        </section>

        <section>
          <h2>Conexiones <span>{connections.length}</span></h2>
          <div className="editor-connection-list">{connections.map((connection, index) => <div key={`${connection.from}-${connection.to}-${index}`}><button type="button" onClick={() => { setSelectedId(connection.from); setConnectionSourceId(connection.from) }}>{connection.from} → {connection.to}</button><button type="button" aria-label={`Eliminar conexión ${connection.from} a ${connection.to}`} onClick={() => setConnections((current) => current.filter((_, connectionIndex) => connectionIndex !== index))}>×</button></div>)}</div>
        </section>

        <section>
          <h2>Progreso</h2>
          <div className={`editor-save-state${hasUnsavedChanges ? ' is-dirty' : ''}`}><span aria-hidden="true" />{hasUnsavedChanges ? 'Cambios sin guardar' : 'Todo guardado'}</div>
          {constellationRepository.usesFirebase && <p className="editor-help">{session.user ? `Sesión: ${session.user.email ?? session.user.uid}` : 'Inicia sesión con la cuenta administradora para publicar la silueta.'}{session.error ? ` ${session.error}` : ''}</p>}
          <button type="button" className="editor-save-button" onClick={() => void saveProgress()}>Guardar progreso</button>
          {savedProgress && <>
            <p className="editor-saved-at">Último guardado: {new Date(savedProgress.savedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</p>
            <button type="button" className="editor-button" onClick={restoreProgress} disabled={!hasUnsavedChanges}>Restaurar último guardado</button>
            <button type="button" className="editor-text-button" onClick={clearSavedProgress}>Eliminar progreso guardado</button>
          </>}
          {saveMessage && <p className="editor-save-message" role="status">{saveMessage}</p>}
        </section>

        <section>
          <h2>Coordenadas</h2>
          <p className="editor-help">Importa `ID | X_norm | Y_norm | brillo_0_255 | grupo | tamaño`. Los grupos admiten cabello, rostro, facciones y cuerpo.</p>
          <label className="editor-file-input">Importar .txt<input type="file" accept=".txt,text/plain" onChange={importCoordinates} /></label>
          {importMessage && <p className="editor-save-message" role="status">{importMessage}</p>}
          <div className="editor-detection-divider" />
          <h3>Simplificar silueta</h3>
          <p className="editor-help">Elimina puntos demasiado cercanos para conservar sólo la estructura de la constelación.</p>
          <label>Máximo aproximado <output>{simplifyTarget}</output><input type="range" min="100" max="650" step="10" value={simplifyTarget} onChange={(event) => setSimplifyTarget(Number(event.target.value))} /></label>
          <button type="button" className="editor-button" onClick={simplifyImportedPoints} disabled={points.length <= simplifyTarget}>Reducir a {simplifyTarget} puntos</button>
          <div className="editor-detection-divider" />
          <h3>Conexiones automáticas</h3>
          <label className="editor-checkbox"><input type="checkbox" checked={autoConnectionsEnabled} onChange={(event) => setAutoConnectionsEnabled(event.target.checked)} /> Activar al importar y al crear puntos</label>
          <label>Distancia máxima <output>{Math.round(autoConnectionDistance * 100)}%</output><input type="range" min=".01" max=".09" step=".005" value={autoConnectionDistance} onChange={(event) => setAutoConnectionDistance(Number(event.target.value))} /></label>
          <label>Vecinos por punto <output>{autoConnectionNeighbors}</output><input type="range" min="1" max="3" step="1" value={autoConnectionNeighbors} onChange={(event) => setAutoConnectionNeighbors(Number(event.target.value))} /></label>
          <button type="button" className="editor-button" onClick={generateAutomaticConnections} disabled={points.length < 2}>Generar conexiones ahora</button>
          <button type="button" className="editor-export-button" onClick={() => downloadTypeScript('silueta-coordenadas.txt', coordinateFile(points, connections, scene))}>Exportar .txt</button>
        </section>

        <section>
          <h2>Exportar</h2>
          <p className="editor-help">Guarda tu progreso antes de descargar los archivos finales.</p>
          <button type="button" className="editor-export-button" onClick={() => downloadTypeScript('constellationPoints.ts', pointFile(points))}>Descargar constellationPoints.ts</button>
          <button type="button" className="editor-export-button" onClick={() => downloadTypeScript('constellationConnections.ts', connectionFile(connections))}>Descargar constellationConnections.ts</button>
        </section>
      </aside>

      <section className="editor-workspace">
        <div className="editor-toolbar">
          <div className="editor-status"><span>{points.length} puntos</span><span>{connections.length} conexiones</span>{selectedIds.length > 1 && <span>{selectedIds.length} seleccionados</span>}<span>Coordenadas 0–1</span></div>
          <div className="editor-group-legend" aria-label="Colores de conexiones por grupo">
            <span className="group-hair">Cabello</span><span className="group-face">Rostro</span><span className="group-feature">Facciones</span><span className="group-body">Cuerpo</span><span className="group-mixed">Mixta</span>
          </div>
          <label className="editor-new-point-group">Grupo para puntos nuevos <select value={newPointGroup} onChange={(event) => setNewPointGroup(event.target.value as ConstellationPointGroup)}>{GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}</select></label>
          <div className="editor-zoom-controls" aria-label="Controles de zoom">
            <button type="button" onClick={() => updateZoom(zoom - .25)} disabled={zoom === 1} aria-label="Alejar">−</button>
            <label>Zoom <input type="range" min="1" max="4" step=".25" value={zoom} onChange={(event) => updateZoom(Number(event.target.value))} /><output>{Math.round(zoom * 100)}%</output></label>
            <button type="button" onClick={() => updateZoom(zoom + .25)} disabled={zoom === 4} aria-label="Acercar">+</button>
            <button type="button" className="editor-zoom-reset" onClick={() => updateZoom(1)} disabled={zoom === 1}>100%</button>
            <button type="button" className={`editor-move-all-button${isMovingAll ? ' is-active' : ''}`} onClick={() => { setIsMovingAll((current) => { const next = !current; if (next) { setIsSelectingMultiple(false); setIsFreeDrawing(false) } return next }) }} aria-pressed={isMovingAll}>{isMovingAll ? 'Terminar mover' : 'Mover silueta'}</button>
            <button type="button" className={`editor-select-button${isSelectingMultiple ? ' is-active' : ''}`} onClick={() => { setIsSelectingMultiple((current) => { const next = !current; if (next) { setIsMovingAll(false); setIsFreeDrawing(false) } return next }) }} aria-pressed={isSelectingMultiple}>{isSelectingMultiple ? 'Terminar selección' : 'Seleccionar varios'}</button>
            <button type="button" className={`editor-draw-button${isFreeDrawing ? ' is-active' : ''}`} onClick={() => { setIsFreeDrawing((current) => { const next = !current; if (next) { setIsMovingAll(false); setIsSelectingMultiple(false) } else setDrawAnchorId(null); return next }) }} aria-pressed={isFreeDrawing}>{isFreeDrawing ? 'Terminar trazo' : 'Trazo libre'}</button>
          </div>
        </div>
        <div className="editor-stage-viewport" ref={viewportRef}>
          <div className="editor-stage" style={{ width: `${zoom * 100}%` }}>
            {referenceImage && <img src={referenceImage} alt="Referencia para trazar la constelación" />}
            <svg className={`${isPanning ? 'is-panning ' : ''}${isMovingAll ? 'is-moving-all' : ''}`} viewBox="0 0 1000 1389" preserveAspectRatio="none" onPointerDown={handleSurfacePointerDown} onPointerMove={handlePointerMove} onPointerUp={finishPointerGesture} onPointerCancel={cancelPointerGesture}>
              <g className={`editor-connections${selectedPoint ? ' has-active-group' : ''}`} pointerEvents="none">{connections.map((connection, index) => {
                const from = positions.get(connection.from)
                const to = positions.get(connection.to)
                if (!from || !to) return null
                const group = from.group === to.group ? from.group : 'mixed'
                const isActive = selectedPoint && group === selectedPoint.group
                return <line key={`${connection.from}-${connection.to}-${index}`} className={`group-${group}${isActive ? ' is-active-group' : ''}`} x1={from.x * 1000} y1={from.y * 1389} x2={to.x * 1000} y2={to.y * 1389} />
              })}</g>
              <g className="editor-detected-points" pointerEvents="none">{detectedPoints.map((detected, index) => previewMatches.has(detected) || previewAdditions.has(detected) ? <circle key={index} cx={detected.x * 1000} cy={detected.y * 1389} r={(previewAdditions.has(detected) ? 11 : 8) / zoom} className={previewAdditions.has(detected) ? 'is-new' : 'is-match'} /> : null)}</g>
              {freeDrawPreview.length > 1 && <polyline className="editor-free-draw-preview" points={freeDrawPreview.map((point) => `${point.x * 1000},${point.y * 1389}`).join(' ')} pointerEvents="none" />}
              {selectionBox && <rect className="editor-selection-box" x={Math.min(selectionBox.start.x, selectionBox.end.x) * 1000} y={Math.min(selectionBox.start.y, selectionBox.end.y) * 1389} width={Math.abs(selectionBox.end.x - selectionBox.start.x) * 1000} height={Math.abs(selectionBox.end.y - selectionBox.start.y) * 1389} pointerEvents="none" />}
              <g className="editor-points" pointerEvents={isSelectingMultiple ? 'none' : undefined}>{points.map((point) => <circle key={point.id} cx={point.x * 1000} cy={point.y * 1389} r={Math.max(point.size * 3.2, 5) / zoom} className={`${selectedIds.includes(point.id) ? 'is-selected ' : ''}group-${point.group}`} onPointerDown={(event) => handlePointPointerDown(event, point.id)} onClick={(event) => event.stopPropagation()} />)}</g>
            </svg>
          </div>
        </div>
        <p className="editor-stage-help">Seleccionar varios: arrastra un marco para marcar y borrar puntos juntos. Trazo libre: arrastra para crear una curva de puntos conectados; pulsa un punto para usarlo como inicio del siguiente trazo. Sin modo activo, clic breve crea un punto.</p>
      </section>
    </div>
  </main>
}
