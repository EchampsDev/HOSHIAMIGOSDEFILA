import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createSetlistTrack, getSetlistAlbum, readSetlistTracks, setlistAlbumLabels, setlistAlbumOrder, writeSetlistTracks, type SetlistAlbum, type SetlistTrack } from '../data/localSetlistCatalog'
import { resolveSetlistCoverUrl, setlistCatalogRepository } from '../repositories/SetlistCatalogRepository'
import { useGoogleSession } from '../../access/useGoogleSession'
import { setlistCoverStorageRepository } from '../../media/repositories/SetlistCoverStorageRepository'

export function SetlistManagerPage() {
  const [tracks, setTracks] = useState<SetlistTrack[]>(readSetlistTracks)
  const [message, setMessage] = useState<string | null>(null)
  const [uploadingTrackId, setUploadingTrackId] = useState<string | null>(null)
  const session = useGoogleSession()
  useEffect(() => setlistCatalogRepository.subscribe((remoteTracks) => { if (remoteTracks.length) { setTracks(remoteTracks); writeSetlistTracks(remoteTracks) } }, () => setMessage('No fue posible sincronizar el catálogo con Firebase. Se usará la copia local.')), [])
  const commit = async (next: SetlistTrack[]) => { setTracks(next); writeSetlistTracks(next); try { if (setlistCatalogRepository.usesFirebase) { await setlistCatalogRepository.save(next); setMessage('Catálogo publicado para todas las personas.') } else setMessage('Catálogo guardado sólo en este navegador.'); return true } catch { setMessage('No fue posible publicar el catálogo. Revisa que tu cuenta sea administradora.'); return false } }
  const addTrack = () => commit([...tracks, createSetlistTrack(`Track ${tracks.length + 1}`)])
  const updateTrack = (id: string, patch: Partial<SetlistTrack>) => commit(tracks.map((track) => track.id === id ? { ...track, ...patch } : track))
  const removeTrack = async (track: SetlistTrack) => {
    const saved = await commit(tracks.filter((item) => item.id !== track.id))
    if (!saved || !track.coverObjectKey || !session.user || !session.isAdmin) return
    try { await setlistCoverStorageRepository.delete(track.coverObjectKey, await session.user.getIdToken()) }
    catch { setMessage('El track se eliminó, pero no fue posible limpiar su portada de R2.') }
  }
  const uploadCover = async (track: SetlistTrack, file?: File) => {
    if (!file) return
    const album = getSetlistAlbum(track)
    if (album === 'OTHER') { setMessage('Selecciona primero el álbum de la canción.'); return }
    if (!session.user || !session.isAdmin) { setMessage('Inicia sesión con una cuenta administradora para subir portadas a R2.'); return }
    setUploadingTrackId(track.id); setMessage(null)
    try {
      const token = await session.user.getIdToken()
      const stored = await setlistCoverStorageRepository.upload(file, album, token)
      const saved = await commit(tracks.map((item) => item.id === track.id ? { ...item, album, coverUrl: stored.readUrl, coverObjectKey: stored.objectKey } : item))
      if (!saved) await setlistCoverStorageRepository.delete(stored.objectKey, token)
      else if (track.coverObjectKey && track.coverObjectKey !== stored.objectKey) await setlistCoverStorageRepository.delete(track.coverObjectKey, token)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible subir la portada a R2.') }
    finally { setUploadingTrackId(null) }
  }
  return <main className="setlist-manager-page"><header className="album-editor-header"><div><p>HERRAMIENTA INTERNA · DESARROLLO</p><h1>Catálogo musical</h1></div><Link to="/dev/album-editor">Volver a la libreta</Link></header><section className="setlist-manager-intro"><p>Nombra las canciones, asigna su álbum y pega la ruta de la portada correspondiente en GitHub. La portada también permite clasificar automáticamente el catálogo.</p><button type="button" onClick={addTrack}>+ Añadir track</button>{message && <small>{message}</small>}</section><section className="setlist-manager-grid">{tracks.map((track, index) => <article key={track.id}><div className="setlist-cover">{track.coverUrl ? <img src={resolveSetlistCoverUrl(track.coverUrl)} alt={`Portada de ${track.title}`} /> : <span>{String(index + 1).padStart(2, '0')}</span>}</div><label>Título<input value={track.title} onChange={(event) => void updateTrack(track.id, { title: event.target.value })} /></label><label>Álbum / colección<select value={getSetlistAlbum(track)} onChange={(event) => void updateTrack(track.id, { album: event.target.value as SetlistAlbum })}>{getSetlistAlbum(track) === 'OTHER' && <option value="OTHER" disabled>Selecciona un álbum</option>}{setlistAlbumOrder.map((album) => <option key={album} value={album}>{setlistAlbumLabels[album]}</option>)}</select></label>{setlistCoverStorageRepository.supportsUpload && <label className="setlist-upload">Portada en Cloudflare R2<input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" disabled={uploadingTrackId === track.id} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void uploadCover(track, file) }} /></label>}<label>Ruta de portada existente<input type="text" value={track.coverUrl ?? ''} placeholder="images/tracks/Hoshi.jpg" onChange={(event) => void updateTrack(track.id, { coverUrl: event.target.value.trim() || undefined, coverObjectKey: undefined })} /></label><button type="button" className="setlist-delete" onClick={() => void removeTrack(track)}>Eliminar</button></article>)}</section>{!tracks.length && <p className="setlist-empty">Aún no hay tracks. Añade los que quieras poner a disposición de las personas.</p>}</main>
}
