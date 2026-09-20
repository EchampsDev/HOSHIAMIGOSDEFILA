import { useState, type FormEvent } from 'react'
import { useGoogleSession } from '../../access/useGoogleSession'
import { stickerGroupId, UNCATEGORIZED_STICKER_GROUP_ID } from '../domain/catalog'
import type { CommunitySticker } from '../domain/types'
import { useStickerCatalog } from '../hooks/useStickerCatalog'
import { useStickerFavorites } from '../hooks/useStickerFavorites'
import { useStickerLibrary } from '../hooks/useStickerLibrary'
import { StickerArtwork } from './StickerArtwork'
import { StickerUploader } from './StickerUploader'

function StickerAdminRow({ sticker, groupId, groups, favorite, busy, onSave, onGroup, onFavorite, onDelete }: { sticker: CommunitySticker; groupId: string; groups: { id: string; name: string }[]; favorite: boolean; busy: boolean; onSave: (title: string, description: string) => Promise<void>; onGroup: (groupId?: string) => Promise<void>; onFavorite: () => void; onDelete: () => Promise<void> }) {
  const [title, setTitle] = useState(sticker.title)
  const [description, setDescription] = useState(sticker.description ?? '')
  const editable = !sticker.id.startsWith('demo-')
  const changed = title.trim() !== sticker.title || description.trim() !== (sticker.description ?? '')
  return <article className="sticker-admin-row"><StickerArtwork stickerId={sticker.id} alt={sticker.title} /><div className="sticker-admin-fields"><label>Nombre<input value={title} maxLength={60} disabled={!editable || busy} onChange={(event) => setTitle(event.target.value)} /></label><label>Descripción<textarea value={description} maxLength={240} disabled={!editable || busy} onChange={(event) => setDescription(event.target.value)} /></label><small>{sticker.authorName?.trim() || 'Autor anónimo'}{!editable ? ' · sticker base protegido' : ''}</small></div><label>Grupo<select value={groupId === UNCATEGORIZED_STICKER_GROUP_ID ? '' : groupId} disabled={busy} onChange={(event) => void onGroup(event.target.value || undefined)}><option value="">Sin clasificar</option>{groups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</select></label><div className="sticker-admin-actions"><button type="button" className={favorite ? 'is-favorite' : ''} aria-pressed={favorite} onClick={onFavorite}>{favorite ? '♥ Favorito' : '♡ Favorito'}</button><button type="button" disabled={!editable || !title.trim() || !changed || busy} onClick={() => void onSave(title.trim(), description.trim())}>Guardar cambios</button><button type="button" className="is-danger" disabled={!editable || busy} onClick={() => void onDelete()}>Eliminar</button></div></article>
}

export function StickerCollectionManager() {
  const session = useGoogleSession()
  const library = useStickerLibrary()
  const collections = useStickerCatalog()
  const favorites = useStickerFavorites(session.user?.uid)
  const [newGroupName, setNewGroupName] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const addGroup = (event: FormEvent) => {
    event.preventDefault()
    const name = newGroupName.trim()
    if (!name) return
    void collections.addGroup(name)
    setNewGroupName('')
  }
  const saveSticker = async (sticker: CommunitySticker, title: string, description: string) => {
    setBusyId(sticker.id); setMessage(null)
    try { await library.updateSticker(sticker.id, { title, description }); setMessage(`Se actualizó “${title}”.`) }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible actualizar el sticker.') }
    finally { setBusyId(null) }
  }
  const deleteSticker = async (sticker: CommunitySticker) => {
    if (!window.confirm(`¿Eliminar permanentemente “${sticker.title}”? Esta acción no afecta otras aportaciones.`)) return
    setBusyId(sticker.id); setMessage(null)
    try { await library.deleteSticker(sticker.id); await collections.assignSticker(sticker.id, undefined); setMessage(`Se eliminó “${sticker.title}”.`) }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible eliminar el sticker.') }
    finally { setBusyId(null) }
  }

  return <section className="sticker-collection-manager" aria-labelledby="sticker-manager-title">
    <header><p className="eyebrow">BIBLIOTECA · ORGANIZACIÓN</p><h1 id="sticker-manager-title">Colecciones de stickers</h1><p>Crea grupos, edita la ficha de cada sticker y decide dónde aparece dentro del archivo público.</p></header>
    <section className="sticker-manager-upload"><div className="sticker-manager-heading"><h2>Agregar stickers</h2><span>Revisión requerida</span></div><StickerUploader defaultAuthorName={session.user?.displayName ?? ''} /></section>
    <section className="sticker-manager-groups" aria-labelledby="sticker-groups-title"><div className="sticker-manager-heading"><h2 id="sticker-groups-title">Grupos</h2><span>{collections.catalog.groups.length} activos</span></div>
      <form className="sticker-manager-add" onSubmit={addGroup}><label>Nuevo grupo<input value={newGroupName} maxLength={60} onChange={(event) => setNewGroupName(event.target.value)} placeholder="Nombre de la colección" /></label><button type="submit" disabled={!newGroupName.trim() || collections.saving}>Agregar grupo</button></form>
      <div className="sticker-manager-group-list">{collections.catalog.groups.map((group, index) => <article key={group.id}>
        <label>Nombre<input key={`${group.id}-${group.name}`} defaultValue={group.name} maxLength={60} onBlur={(event) => { const name = event.target.value.trim(); if (name && name !== group.name) void collections.renameGroup(group.id, name) }} /></label>
        <div><button type="button" disabled={index === 0 || collections.saving} onClick={() => void collections.moveGroup(group.id, -1)} aria-label={`Subir ${group.name}`}>↑</button><button type="button" disabled={index === collections.catalog.groups.length - 1 || collections.saving} onClick={() => void collections.moveGroup(group.id, 1)} aria-label={`Bajar ${group.name}`}>↓</button><button type="button" className="is-danger" disabled={collections.saving} onClick={() => { if (window.confirm(`¿Quitar el grupo “${group.name}”? Sus stickers pasarán a Sin clasificar.`)) void collections.removeGroup(group.id) }}>Quitar</button></div>
      </article>)}</div>
    </section>
    <section className="sticker-manager-assignments" aria-labelledby="sticker-assignments-title"><div className="sticker-manager-heading"><h2 id="sticker-assignments-title">Administrar stickers</h2><span>{library.approved.length} disponibles</span></div>
      {library.loading || collections.loading ? <p className="sticker-loading"><i aria-hidden="true">✦</i> Abriendo la colección…</p> : <div className="sticker-assignment-list">{library.approved.map((sticker) => <StickerAdminRow key={sticker.id} sticker={sticker} groupId={stickerGroupId(sticker, collections.catalog)} groups={collections.catalog.groups} favorite={favorites.favorites.has(sticker.id)} busy={busyId === sticker.id || collections.saving} onSave={(title, description) => saveSticker(sticker, title, description)} onGroup={(groupId) => collections.assignSticker(sticker.id, groupId)} onFavorite={() => favorites.toggleFavorite(sticker.id)} onDelete={() => deleteSticker(sticker)} />)}</div>}
    </section>
    {(library.error || collections.error || session.error) && <p className="sticker-manager-status" role="alert">{library.error ?? collections.error ?? session.error}</p>}
    {message && <p className="sticker-manager-status" role="status">{message}</p>}
    {collections.saving && <p className="sticker-manager-status" role="status">Guardando organización…</p>}
  </section>
}