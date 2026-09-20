import { useState, type ChangeEvent } from 'react'
import { useGoogleSession } from '../../access/useGoogleSession'
import { backgroundFitValues, backgroundPositionValues, type BrattychartsBackground } from '../domain/appearance'
import { useBrattychartsAppearance } from '../hooks/useBrattychartsAppearance'
import { brattychartsAppearanceRepository } from '../repositories/BrattychartsAppearanceRepository'

const fitLabels = { cover: 'Pantalla completa', contain: 'Centrada', repeat: 'Mosaico', extended: 'Extendida' }

export function BrattychartsAppearanceManager() {
  const session = useGoogleSession()
  const { settings, backgrounds, loading, error } = useBrattychartsAppearance()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const adminToken = async () => {
    if (!session.user || !session.isAdmin) throw new Error('Se requiere una sesión administradora para modificar los archivos.')
    return session.user.getIdToken()
  }
  const execute = async (action: () => Promise<unknown>, success: string) => { setBusy(true); setMessage(null); try { await action(); setMessage(success) } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No fue posible completar la acción.') } finally { setBusy(false) } }
  const update = (item: BrattychartsBackground, patch: Parameters<typeof brattychartsAppearanceRepository.updateBackground>[1]) => execute(() => brattychartsAppearanceRepository.updateBackground(item.id, patch), 'Apariencia actualizada.')
  const uploadBackground = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void execute(async () => brattychartsAppearanceRepository.uploadBackground(file, await adminToken()), 'Fondo guardado y seleccionado.') }
  const uploadVideo = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void execute(async () => brattychartsAppearanceRepository.uploadVideo(file, await adminToken()), 'Video guardado y activado.') }

  if (loading) return <section className="brattycharts-appearance-manager"><p>Cargando apariencia…</p></section>
  return <section className="brattycharts-appearance-manager" aria-labelledby="appearance-title">
    <header><div><p>PERSONALIZACIÓN</p><h2 id="appearance-title">Apariencia del landing</h2></div><strong>{backgrounds.length} / 20 fondos</strong></header>
    {(error || message) && <p className="brattycharts-manager-message" role="status">{error || message}</p>}
    <div className="brattycharts-manager-settings">
      <label>Tiempo por imagen<input type="number" min="3" max="30" value={settings.slideshowIntervalMs / 1000} onChange={(event) => void execute(() => brattychartsAppearanceRepository.saveSlideshow(settings, { slideshowIntervalMs: Number(event.target.value) * 1000, transitionMs: settings.transitionMs }), 'Tiempo del slideshow actualizado.')} /><span>segundos</span></label>
      <label>Duración del crossfade<input type="number" min="0.2" max="5" step="0.1" value={settings.transitionMs / 1000} onChange={(event) => void execute(() => brattychartsAppearanceRepository.saveSlideshow(settings, { slideshowIntervalMs: settings.slideshowIntervalMs, transitionMs: Number(event.target.value) * 1000 }), 'Transición actualizada.')} /><span>segundos</span></label>
      <label className={`brattycharts-upload${backgrounds.length >= 20 ? ' is-disabled' : ''}`}>Añadir imagen<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || backgrounds.length >= 20} onChange={uploadBackground} /></label>
    </div>
    <div className="brattycharts-background-list">{backgrounds.map((item) => <article key={item.id}>
      <img src={item.imageUrl} alt="" loading="lazy" />
      <div className="brattycharts-background-fields">
        <label>Nombre<input defaultValue={item.name} maxLength={100} onBlur={(event) => { if (event.target.value.trim() !== item.name) void update(item, { name: event.target.value.trim() || item.name }) }} /></label>
        <label>Orden<input type="number" defaultValue={item.order} onBlur={(event) => void update(item, { order: Number(event.target.value) })} /></label>
        <label>Modo<select value={item.fit} onChange={(event) => void update(item, { fit: event.target.value as BrattychartsBackground['fit'] })}>{backgroundFitValues.map((value) => <option value={value} key={value}>{fitLabels[value]}</option>)}</select></label>
        <label>Posición<select value={item.position} onChange={(event) => void update(item, { position: event.target.value as BrattychartsBackground['position'] })}>{backgroundPositionValues.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
        <label>Oscurecimiento <span>{Math.round(item.overlayOpacity * 100)}%</span><input type="range" min="0" max="0.85" step="0.05" value={item.overlayOpacity} onChange={(event) => void update(item, { overlayOpacity: Number(event.target.value) })} /></label>
        <label>Blur <span>{item.blurPx}px</span><input type="range" min="0" max="16" value={item.blurPx} onChange={(event) => void update(item, { blurPx: Number(event.target.value) })} /></label>
      </div>
      <footer><label><input type="checkbox" checked={item.enabled} onChange={(event) => void update(item, { enabled: event.target.checked })} /> Activo</label><label><input type="checkbox" checked={item.selected} onChange={(event) => void update(item, { selected: event.target.checked })} /> En slideshow</label><button type="button" disabled={busy} onClick={() => { if (window.confirm(`¿Eliminar ${item.name}?`)) void execute(async () => brattychartsAppearanceRepository.deleteBackground(item, await adminToken()), 'Fondo eliminado.') }}>Eliminar</button></footer>
    </article>)}</div>
    <section className="brattycharts-video-manager"><div><h3>Video de fondo</h3><p>MP4, MOV o WebM · máximo 100 MB y 5 minutos.</p></div><label className="brattycharts-upload">{settings.videoUrl ? 'Reemplazar video' : 'Subir video'}<input type="file" accept="video/mp4,video/quicktime,video/webm" disabled={busy} onChange={uploadVideo} /></label>{settings.videoUrl && <><label><input type="checkbox" checked={settings.videoEnabled} onChange={(event) => void execute(() => brattychartsAppearanceRepository.setVideoEnabled(event.target.checked), event.target.checked ? 'Video activado.' : 'Video desactivado; vuelve el slideshow.')} /> Video activo</label><span>{settings.videoOriginalName} · {Math.round(settings.videoDurationSeconds || 0)} s</span><button type="button" disabled={busy} onClick={() => { if (window.confirm('¿Eliminar el video de fondo?')) void execute(async () => brattychartsAppearanceRepository.deleteVideo(await adminToken()), 'Video eliminado; vuelve el slideshow.') }}>Eliminar video</button></>}
    </section>
  </section>
}
