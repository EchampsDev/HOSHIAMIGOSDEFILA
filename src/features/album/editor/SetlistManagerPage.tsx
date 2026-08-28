import { useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { createSetlistTrack, readSetlistTracks, writeSetlistTracks, type SetlistTrack } from '../data/localSetlistCatalog'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export function SetlistManagerPage() {
  const [tracks, setTracks] = useState<SetlistTrack[]>(readSetlistTracks)
  const [message, setMessage] = useState<string | null>(null)
  const commit = (next: SetlistTrack[]) => { setTracks(next); writeSetlistTracks(next) }
  const addTrack = () => commit([...tracks, createSetlistTrack(`Track ${tracks.length + 1}`)])
  const updateTrack = (id: string, patch: Partial<SetlistTrack>) => commit(tracks.map((track) => track.id === id ? { ...track, ...patch } : track))
  const removeTrack = (id: string) => commit(tracks.filter((track) => track.id !== id))
  const chooseCover = (event: ChangeEvent<HTMLInputElement>, id: string) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > MAX_IMAGE_BYTES) { setMessage('La portada debe ser una imagen de máximo 5 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => { updateTrack(id, { coverUrl: String(reader.result) }); setMessage('Portada guardada localmente.') }
    reader.readAsDataURL(file)
    event.target.value = ''
  }
  return <main className="setlist-manager-page"><header className="album-editor-header"><div><p>HERRAMIENTA INTERNA · DESARROLLO</p><h1>Setlist Manager</h1></div><Link to="/dev/album-editor">Volver a la libreta</Link></header><section className="setlist-manager-intro"><p>Sube las portadas y nombra las canciones que podrán elegir los participantes. Durante esta prueba el catálogo se guarda solamente en este navegador.</p><button type="button" onClick={addTrack}>+ Añadir track</button>{message && <small>{message}</small>}</section><section className="setlist-manager-grid">{tracks.map((track, index) => <article key={track.id}><div className="setlist-cover">{track.coverUrl ? <img src={track.coverUrl} alt={`Portada de ${track.title}`} /> : <span>{String(index + 1).padStart(2, '0')}</span>}</div><label>Título<input value={track.title} onChange={(event) => updateTrack(track.id, { title: event.target.value })} /></label><label className="setlist-upload">Subir portada<input type="file" accept="image/*" onChange={(event) => chooseCover(event, track.id)} /></label><button type="button" className="setlist-delete" onClick={() => removeTrack(track.id)}>Eliminar</button></article>)}</section>{!tracks.length && <p className="setlist-empty">Aún no hay tracks. Añade los que quieras poner a disposición de las personas.</p>}</main>
}
