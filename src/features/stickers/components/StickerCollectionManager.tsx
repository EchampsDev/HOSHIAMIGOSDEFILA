import { useState, type FormEvent } from 'react'
import { stickerGroupId, UNCATEGORIZED_STICKER_GROUP_ID } from '../domain/catalog'
import { useStickerCatalog } from '../hooks/useStickerCatalog'
import { useStickerLibrary } from '../hooks/useStickerLibrary'
import { StickerArtwork } from './StickerArtwork'

export function StickerCollectionManager() {
  const library = useStickerLibrary()
  const collections = useStickerCatalog()
  const [newGroupName, setNewGroupName] = useState('')

  const addGroup = (event: FormEvent) => {
    event.preventDefault()
    const name = newGroupName.trim()
    if (!name) return
    void collections.addGroup(name)
    setNewGroupName('')
  }

  return <section className="sticker-collection-manager" aria-labelledby="sticker-manager-title">
    <header><p className="eyebrow">BIBLIOTECA · ORGANIZACIÓN</p><h1 id="sticker-manager-title">Colecciones de stickers</h1><p>Crea grupos, cambia su orden y decide dónde aparece cada sticker público.</p></header>
    <section className="sticker-manager-groups" aria-labelledby="sticker-groups-title"><div className="sticker-manager-heading"><h2 id="sticker-groups-title">Grupos</h2><span>{collections.catalog.groups.length} activos</span></div>
      <form className="sticker-manager-add" onSubmit={addGroup}><label>Nuevo grupo<input value={newGroupName} maxLength={60} onChange={(event) => setNewGroupName(event.target.value)} placeholder="Nombre de la colección" /></label><button type="submit" disabled={!newGroupName.trim() || collections.saving}>Agregar grupo</button></form>
      <div className="sticker-manager-group-list">{collections.catalog.groups.map((group, index) => <article key={group.id}>
        <label>Nombre<input key={`${group.id}-${group.name}`} defaultValue={group.name} maxLength={60} onBlur={(event) => { const name = event.target.value.trim(); if (name && name !== group.name) void collections.renameGroup(group.id, name) }} /></label>
        <div><button type="button" disabled={index === 0 || collections.saving} onClick={() => void collections.moveGroup(group.id, -1)} aria-label={`Subir ${group.name}`}>↑</button><button type="button" disabled={index === collections.catalog.groups.length - 1 || collections.saving} onClick={() => void collections.moveGroup(group.id, 1)} aria-label={`Bajar ${group.name}`}>↓</button><button type="button" className="is-danger" disabled={collections.saving} onClick={() => { if (window.confirm(`¿Quitar el grupo “${group.name}”? Sus stickers pasarán a Sin clasificar.`)) void collections.removeGroup(group.id) }}>Quitar</button></div>
      </article>)}</div>
    </section>
    <section className="sticker-manager-assignments" aria-labelledby="sticker-assignments-title"><div className="sticker-manager-heading"><h2 id="sticker-assignments-title">Organizar stickers</h2><span>{library.approved.length} disponibles</span></div>
      {library.loading || collections.loading ? <p className="sticker-loading"><i aria-hidden="true">✦</i> Abriendo la colección…</p> : <div className="sticker-assignment-list">{library.approved.map((sticker) => {
        const currentGroup = stickerGroupId(sticker, collections.catalog)
        return <article key={sticker.id}><StickerArtwork stickerId={sticker.id} alt={sticker.title} /><div><strong>{sticker.title}</strong><small>{sticker.authorName?.trim() || 'Autor anónimo'}</small></div><label>Grupo<select value={currentGroup === UNCATEGORIZED_STICKER_GROUP_ID ? '' : currentGroup} disabled={collections.saving} onChange={(event) => void collections.assignSticker(sticker.id, event.target.value || undefined)}><option value="">Sin clasificar</option>{collections.catalog.groups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</select></label></article>
      })}</div>}
    </section>
    {(library.error || collections.error) && <p className="sticker-manager-status" role="alert">{library.error ?? collections.error}</p>}
    {collections.saving && <p className="sticker-manager-status" role="status">Guardando organización…</p>}
  </section>
}
