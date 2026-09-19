import { useState, type ChangeEvent, type FormEvent } from 'react'
import { BrattypolitanExperienceLockup } from '../../components/BrattypolitanWordmark'
import { FourPointMark } from '../../components/FourPointMark'
import { useGoogleSession } from '../access/useGoogleSession'
import { StarfieldBackground } from '../landing/components/StarfieldBackground'
import { useBrattyExperience } from './hooks/useBrattyExperience'
import { brattyVideoRepository } from './repositories/BrattyVideoRepository'

export function BrattyInvitationPage() {
  const session = useGoogleSession()
  const experience = useBrattyExperience()
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const authorized = session.isAdmin || session.role === 'SPECIAL'

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null
    if (!selected) return
    try { brattyVideoRepository.validate(selected); setFile(selected); setStatus(null) }
    catch (error) { event.target.value = ''; setFile(null); setStatus(error instanceof Error ? error.message : 'Ese archivo no es válido.') }
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!file || !session.user || !authorized) return
    setBusy(true); setProgress(0); setStatus(null)
    try {
      const uploaded = await brattyVideoRepository.upload(file, setProgress)
      await experience.saveSubmission({ ...uploaded, authorName: session.user.displayName ?? 'Bratty', message: message.trim(), originalName: file.name, contentType: file.type, uploadedAt: new Date().toISOString() })
      setStatus('Tu video quedó guardado. El equipo podrá revisarlo y decidir cuándo mostrar la sorpresa a los fans.')
      setFile(null)
    } catch (error) { setStatus(error instanceof Error ? error.message : 'No fue posible guardar el video.') }
    finally { setBusy(false) }
  }

  if (experience.loading) return <><StarfieldBackground /><main className="bratty-invitation bratty-invitation--loading" aria-busy="true"><FourPointMark /><p>Preparando tu invitación…</p></main></>
  if (!experience.settings.invitationActive) return <><StarfieldBackground /><main className="bratty-invitation bratty-invitation--paused"><section><FourPointMark /><p className="eyebrow">UN MENSAJE PARA BRATTY</p><h1>Esto se está consolidando.</h1><p>Los fans te tenemos una pequeña sorpresa. Vuelve aquí el <strong>25 de septiembre</strong>.</p></section></main></>

  return <><StarfieldBackground /><main className="bratty-invitation">
    <header><BrattypolitanExperienceLockup /><span>ACCESO ESPECIAL · BRATTY</span></header>
    <section className="bratty-invitation-intro"><FourPointMark /><p className="eyebrow">HOLA, BRATTY</p><h1>Esta libreta también quiere guardar tu voz.</h1><p>Durante la fila, tus fans construirán una libreta física y digital con mensajes, dibujos y recuerdos para ti. Queremos invitarte a participar dejando un video con lo que tú quieras decir, compartir o aportar.</p><p>Cuando el equipo active la sorpresa, este mensaje será lo primero que verán antes de abrir la libreta.</p></section>
    {!session.user ? <section className="bratty-access-card"><span>01</span><h2>Confirma tu acceso</h2><p>Este espacio está reservado. Accede con la cuenta que el equipo haya marcado como usuario especial.</p><button type="button" onClick={() => void session.signIn()}>Acceder con Google</button>{session.error && <p role="alert">{session.error}</p>}</section>
      : !authorized ? <section className="bratty-access-card"><span>ACCESO PENDIENTE</span><h2>Tu cuenta ya está registrada.</h2><p>Pide al equipo que la marque como “Usuario especial” desde el panel administrativo y vuelve a entrar.</p><button type="button" onClick={() => void session.signOut()}>Usar otra cuenta</button></section>
        : <section className="bratty-upload-card"><header><div><span>02</span><h2>Deja tu sorpresa</h2></div><small>{session.user.displayName ?? session.user.email}</small></header>
          {experience.submission && <div className="bratty-current-video"><p>VIDEO GUARDADO</p><video src={experience.submission.videoUrl} controls playsInline preload="metadata" /><span>Subido el {new Date(experience.submission.uploadedAt).toLocaleDateString('es-MX')}. Puedes reemplazarlo cargando otro.</span></div>}
          <form onSubmit={(event) => void submit(event)}><label className="bratty-video-picker"><span>{file ? file.name : 'Seleccionar video'}</span><small>MP4, MOV o WebM · máximo 300 MB</small><input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={chooseFile} /></label><label>Unas palabras para acompañarlo <textarea maxLength={500} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Opcional: escribe un mensaje breve para tus fans." /><small>{message.length} / 500</small></label>{busy && <div className="bratty-upload-progress" aria-live="polite"><i style={{ width: `${progress}%` }} /><span>Cargando {progress}%</span></div>}<button type="submit" disabled={!file || busy}>{busy ? 'Guardando…' : experience.submission ? 'Reemplazar video' : 'Guardar video'}</button></form>
          {status && <p className="bratty-upload-status" role="status">{status}</p>}<button type="button" className="bratty-signout" onClick={() => void session.signOut()}>Cerrar sesión</button>
        </section>}
    <footer><FourPointMark /><span>Gracias por ser la razón de este recuerdo.</span><FourPointMark /></footer>
  </main></>
}
