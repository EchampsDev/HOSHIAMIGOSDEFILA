import { useEffect, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { useGoogleSession } from '../features/access/useGoogleSession'
import { createStableSlug, emptyNewsDraft, type NewsDraft, type NewsImage, type NewsItem, type NewsStatus } from '../features/news/domain/types'
import { newsImageRepository } from '../features/news/repositories/NewsImageRepository'
import { newsRepository } from '../features/news/repositories/NewsRepository'

const cleanDraft = (item: NewsItem): NewsDraft => ({ title: item.title, description: item.description, slug: item.slug, images: item.images, carouselAlt: item.carouselAlt, instagramUrl: item.instagramUrl, facebookUrl: item.facebookUrl, xUrl: item.xUrl, tiktokUrl: item.tiktokUrl, externalUrl: item.externalUrl, externalLabel: item.externalLabel, order: item.order, visible: item.visible, status: item.status, displayDate: item.displayDate })
const statusLabel: Record<NewsStatus, string> = { draft: 'Borrador', published: 'Publicada', archived: 'Archivada' }

export function AdminNewsPage() {
  const session = useGoogleSession()
  const [items, setItems] = useState<NewsItem[]>([])
  const [editing, setEditing] = useState<NewsItem | null>(null)
  const [form, setForm] = useState<NewsDraft>(emptyNewsDraft)
  const [formOpen, setFormOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [githubImageUrl, setGithubImageUrl] = useState('')
  const [githubImageAlt, setGithubImageAlt] = useState('')

  useEffect(() => newsRepository.subscribeAdmin(setItems, () => setMessage('No fue posible cargar las noticias. Revisa las reglas de Firestore.')), [])
  const startNew = () => { setEditing(null); setForm(emptyNewsDraft()); setFormOpen(true); setMessage(null) }
  const edit = (item: NewsItem) => { setEditing(item); setForm(cleanDraft(item)); setFormOpen(true); setMessage(null) }
  const closeForm = () => { setFormOpen(false); setEditing(null); setForm(emptyNewsDraft()); setGithubImageUrl(''); setGithubImageAlt('') }
  const validForm = () => {
    const slug = form.slug || createStableSlug(form.title)
    if (!form.title.trim() || !form.description.trim() || !slug) { setMessage('Completa título, descripción y slug.'); return null }
    return { ...form, title: form.title.trim(), description: form.description.trim(), slug }
  }
  const save = async () => {
    const value = validForm(); if (!value) return
    setBusy(true)
    try {
      if (editing) await newsRepository.save({ ...editing, ...value })
      else await newsRepository.create({ ...value, status: 'draft' })
      setMessage(editing ? 'Cambios guardados.' : 'Borrador creado. Ábrelo para añadir imágenes o publicarlo.')
      closeForm()
    } catch (error) { setMessage(error instanceof Error ? `No fue posible guardar la noticia: ${error.message}` : 'No fue posible guardar la noticia.') } finally { setBusy(false) }
  }
  const publish = async (item = editing) => {
    if (!item || !session.user) return
    const value = item === editing ? validForm() : cleanDraft(item); if (!value) return
    setBusy(true)
    try { await newsRepository.publish({ ...item, ...value }, session.user.uid); setMessage('Noticia publicada. NEWS_PUBLISHED se creó sólo si fue la primera publicación.'); closeForm() }
    catch (error) { setMessage(error instanceof Error ? `No fue posible publicar la noticia: ${error.message}` : 'No fue posible publicar la noticia.') } finally { setBusy(false) }
  }
  const uploadImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []); event.target.value = ''
    if (!editing || !files.length) return
    setBusy(true)
    try {
      const uploaded = await newsImageRepository.upload(editing.id, files)
      setForm((current) => ({ ...current, images: [...current.images, ...uploaded.map((image, index) => ({ ...image, alt: current.carouselAlt || current.title, order: current.images.length + index }))] }))
      setMessage('Imágenes cargadas. Guarda los cambios para asociarlas a la noticia.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible cargar las imágenes.') } finally { setBusy(false) }
  }
  const addGithubImage = () => {
    try {
      const image = newsImageRepository.addGithubImage(githubImageUrl, githubImageAlt || form.carouselAlt || form.title, form.images.length)
      setForm((current) => ({ ...current, images: [...current.images, image] }))
      setGithubImageUrl('')
      setGithubImageAlt('')
      setMessage('Imagen de GitHub añadida. Guarda los cambios para asociarla a la noticia.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'La ruta de imagen no es válida.') }
  }
  const updateImage = (index: number, patch: Partial<NewsImage>) => setForm((current) => ({ ...current, images: current.images.map((image, position) => position === index ? { ...image, ...patch } : image) }))
  const action = async (callback: () => Promise<void>, success: string) => { setBusy(true); try { await callback(); setMessage(success) } catch { setMessage('No fue posible completar la acción.') } finally { setBusy(false) } }

  return <main className="news-admin-page"><header className="news-admin-header"><div><p>ADMINISTRACIÓN DE NOTICIAS</p><h1>Novedades de BRATTY</h1><span>Crea, ordena y publica el contenido editorial del landing.</span></div><div><Link to="/admin/experiencias">Centro admin</Link><button type="button" onClick={startNew}>Nueva noticia</button></div></header>
    <section className="news-admin-summary"><strong>{items.length}</strong><span>{items.length === 1 ? 'noticia' : 'noticias'}</span></section>
    {message && <p className="news-admin-message" role="status">{message}</p>}
    {formOpen && <section className="news-editor" aria-label={editing ? `Editar ${editing.title}` : 'Nueva noticia'}><header><h2>{editing ? 'Editar noticia' : 'Nueva noticia'}</h2><button type="button" onClick={closeForm}>Cerrar ×</button></header><div className="news-editor-grid">
      <label>Título<input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value, slug: editing?.publishedAt ? current.slug : current.slug || createStableSlug(event.target.value) }))} /></label>
      <label>Slug<input value={form.slug} disabled={Boolean(editing?.publishedAt)} onChange={(event) => setForm((current) => ({ ...current, slug: createStableSlug(event.target.value) }))} /><small>{editing?.publishedAt ? 'El slug queda bloqueado después de publicar.' : `/novedades/${form.slug || 'slug'}`}</small></label>
      <label className="is-wide">Descripción<textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
      <label>Fecha editorial<input type="date" value={form.displayDate ?? ''} onInput={(event) => { const value = event.currentTarget.value; setForm((current) => ({ ...current, displayDate: value || undefined })) }} /><small>Controla la fecha visible sin alterar la auditoría de publicación.</small></label>
      <label>Fecha de publicación<input type="text" readOnly value={editing?.publishedAt ? new Date(editing.publishedAt).toLocaleString('es-MX') : 'Se asignará al publicar'} /></label>
      <label>Orden<input type="number" value={form.order} onChange={(event) => setForm((current) => ({ ...current, order: Number(event.target.value) }))} /></label>
      <label>Estado<select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as NewsStatus }))}><option value="draft">Borrador</option>{editing?.status === 'published' && <option value="published">Publicada</option>}<option value="archived">Archivada</option></select><small>Para pasar a publicada usa la acción Publicar.</small></label>
      <label className="news-checkbox"><input type="checkbox" checked={form.visible} onChange={(event) => setForm((current) => ({ ...current, visible: event.target.checked }))} /> Visible públicamente</label>
      <label className="is-wide">Texto alternativo general<input value={form.carouselAlt ?? ''} onChange={(event) => setForm((current) => ({ ...current, carouselAlt: event.target.value }))} /></label>
      {(['instagramUrl', 'facebookUrl', 'xUrl', 'tiktokUrl'] as const).map((field) => <label key={field}>{field === 'xUrl' ? 'X / Twitter' : field.replace('Url', '')}<input type="url" value={form[field] ?? ''} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value || undefined }))} /></label>)}
      <label>Enlace externo<input type="url" value={form.externalUrl ?? ''} placeholder="https://..." onChange={(event) => setForm((current) => ({ ...current, externalUrl: event.target.value || undefined }))} /></label>
      <label>Texto del enlace<input value={form.externalLabel ?? ''} placeholder="Comprar vinilo" onChange={(event) => setForm((current) => ({ ...current, externalLabel: event.target.value || undefined }))} /></label>
      <section className="news-image-editor is-wide"><h3>Imágenes</h3>{editing ? newsImageRepository.supportsFileUpload ? <label className="news-upload">Añadir imágenes desde Firebase Storage<input type="file" accept="image/*" multiple onChange={(event) => void uploadImages(event)} /></label> : <div className="news-github-image-form"><p><strong>Proveedor activo: GitHub.</strong> Guarda el archivo en <code>public/news/</code> del repositorio y pega una ruta como <code>/news/nombre.jpg</code>. También se aceptan URLs públicas de GitHub Raw.</p><label>Ruta o URL de la imagen<input type="text" value={githubImageUrl} placeholder="/news/mi-noticia/portada.jpg" onChange={(event) => setGithubImageUrl(event.target.value)} /></label><label>Texto alternativo<input value={githubImageAlt} placeholder={form.carouselAlt || form.title || 'Describe la imagen'} onChange={(event) => setGithubImageAlt(event.target.value)} /></label><button type="button" disabled={!githubImageUrl.trim()} onClick={addGithubImage}>Añadir imagen</button></div> : <p>Guarda el borrador antes de añadir imágenes.</p>}<div>{form.images.map((image, index) => <article key={`${image.url}-${index}`}><img src={image.url} alt="" /><label>Alt<input value={image.alt} onChange={(event) => updateImage(index, { alt: event.target.value })} /></label><label>Orden<input type="number" value={image.order} onChange={(event) => updateImage(index, { order: Number(event.target.value) })} /></label><button type="button" onClick={() => setForm((current) => ({ ...current, images: current.images.filter((_, position) => position !== index) }))}>Quitar</button></article>)}</div></section>
    </div><footer><button type="button" onClick={closeForm}>Cancelar</button><button type="button" disabled={busy} onClick={() => void save()}>{editing ? 'Guardar cambios' : 'Guardar borrador'}</button>{editing && <button type="button" className="is-primary" disabled={busy} onClick={() => void publish()}>Publicar</button>}</footer></section>}
    <section className="news-admin-list" aria-label="Noticias ordenadas">{items.length ? items.map((item) => <article key={item.id}><div className="news-admin-thumbnail">{item.images[0] ? <img src={item.images[0].url} alt="" loading="lazy" /> : <span>✦</span>}</div><div><small>ORDEN {item.order} · {statusLabel[item.status]} · {item.visible ? 'VISIBLE' : 'OCULTA'}</small><h2>{item.title}</h2><time>{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('es-MX') : 'Sin publicar'}</time></div><div className="news-admin-actions">{item.status === 'published' && <Link to={`/novedades/${item.slug}`}>Abrir</Link>}<button type="button" onClick={() => edit(item)}>Editar</button>{item.status !== 'published' && <button type="button" disabled={busy} onClick={() => void publish(item)}>Publicar</button>}<button type="button" disabled={busy} onClick={() => void action(() => newsRepository.setVisibility(item, !item.visible), item.visible ? 'Noticia oculta.' : 'Noticia visible.')}>{item.visible ? 'Ocultar' : 'Mostrar'}</button>{item.status !== 'archived' && <button type="button" disabled={busy} onClick={() => void action(() => newsRepository.archive(item), 'Noticia archivada.')}>Archivar</button>}<button type="button" className="is-danger" disabled={busy} onClick={() => { if (window.confirm(`¿Eliminar ${item.title}? Se archivará y podrá recuperarse desde Firestore.`)) void action(() => newsRepository.softDelete(item), 'Noticia eliminada de forma recuperable.') }}>Eliminar</button></div></article>) : <p>Aún no hay noticias. Crea el primer borrador.</p>}</section>
  </main>
}
