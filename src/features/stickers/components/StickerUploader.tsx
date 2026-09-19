import { useState, type ChangeEvent } from 'react'
import { createPendingSticker } from '../services/createPendingSticker'
import { STICKER_MAX_BYTES, STICKER_MAX_HEIGHT, STICKER_MAX_WIDTH } from '../domain/stickerFileValidation'

export function StickerUploader({ defaultAuthorName }: { defaultAuthorName?: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [authorName, setAuthorName] = useState(defaultAuthorName ?? '')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null
    setFile(selected); setStatus(null); setPreview(null)
    if (selected) { const reader = new FileReader(); reader.onload = () => setPreview(String(reader.result)); reader.readAsDataURL(selected) }
    event.target.value = ''
  }
  const submit = async () => {
    if (!file) { setStatus('Selecciona una imagen PNG o WEBP.'); return }
    setBusy(true); setStatus(null)
    try {
      await createPendingSticker(file, title, authorName, description)
      setStatus('¡Gracias! Tu sticker quedó pendiente de revisión y todavía no es público.')
      setFile(null); setPreview(null); setTitle(''); setDescription('')
    } catch (error) { setStatus(error instanceof Error ? error.message : 'No fue posible guardar el sticker.') }
    finally { setBusy(false) }
  }
  return <details className="sticker-uploader"><summary>Subir un sticker propio <span aria-hidden="true">＋</span></summary><div className="sticker-uploader-body">
    <p>Conservaremos su transparencia. Se publicará únicamente después de la aprobación del equipo.</p>
    <label className="sticker-file-drop"><input type="file" accept=".png,.webp,image/png,image/webp" onChange={chooseFile} /><span>{preview ? <img src={preview} alt="Vista previa del sticker" /> : <i aria-hidden="true">✦</i>}<b>{file?.name ?? 'Elegir imagen'}</b><small>PNG o WEBP · máximo {STICKER_MAX_BYTES / 1024 / 1024} MB · hasta {STICKER_MAX_WIDTH} × {STICKER_MAX_HEIGHT} px</small></span></label>
    <label>Título<input value={title} maxLength={60} onChange={(event) => setTitle(event.target.value)} placeholder="Ej. Mi estrella para Bratty" /></label>
    <label>Autor, opcional<input value={authorName} maxLength={60} onChange={(event) => setAuthorName(event.target.value)} placeholder="Tu nombre" /></label>
    <label>Descripción breve, opcional<textarea value={description} maxLength={240} onChange={(event) => setDescription(event.target.value)} placeholder="Cuenta qué representa este sticker." /></label>
    <button type="button" className="sticker-primary-action" disabled={busy || !file} onClick={() => void submit()}>{busy ? 'Validando y guardando…' : 'Enviar a revisión'}</button>
    {status && <p className="sticker-upload-status" role="status">{status}</p>}
  </div></details>
}
