import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { useGoogleSession } from '../../access/useGoogleSession'
import { useBrattyExperience } from '../hooks/useBrattyExperience'

export function BrattyExperienceSettingsPage() {
  const session = useGoogleSession()
  const experience = useBrattyExperience()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [qrImage, setQrImage] = useState('')
  const invitationUrl = `${window.location.origin}/para-bratty`

  useEffect(() => {
    let cancelled = false
    void QRCode.toDataURL(invitationUrl, {
      width: 360,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#111111ff', light: '#f3ead8ff' },
    }).then((image) => {
      if (!cancelled) setQrImage(image)
    })
    return () => { cancelled = true }
  }, [invitationUrl])
  const update = async (patch: Partial<typeof experience.settings>) => {
    if (!session.isAdmin && !import.meta.env.DEV) return
    setBusy(true); setMessage(null)
    try { await experience.saveSettings({ ...experience.settings, ...patch }); setMessage('Configuración guardada.') }
    catch { setMessage('No fue posible guardar. Confirma la sesión administradora y las reglas de Firebase.') }
    finally { setBusy(false) }
  }
  const copyLink = async () => { await navigator.clipboard.writeText(invitationUrl); setMessage('Enlace copiado.') }

  return <main className="bratty-admin-page"><header><div><p>EXPERIENCIA ESPECIAL</p><h1>Acceso para Bratty</h1><span>Controla la invitación privada y la sorpresa que aparece antes de la libreta.</span></div><Link to="/admin/experiencias">Centro admin</Link></header>
    <section className="bratty-admin-link">
      {qrImage && <figure className="bratty-admin-qr"><img src={qrImage} alt="Código QR del acceso aislado para Bratty" /><figcaption>QR exclusivo · /para-bratty</figcaption></figure>}
      <div className="bratty-admin-link-details"><label>ENLACE AISLADO PARA EL CÓDIGO QR<input readOnly value={invitationUrl} /></label><div><button type="button" onClick={() => void copyLink()}>Copiar enlace</button>{qrImage && <a href={qrImage} download="acceso-para-bratty.png">Descargar QR</a>}<Link to="/para-bratty">Abrir vista</Link></div></div>
    </section>
    <section className="bratty-admin-controls"><article className={experience.settings.invitationActive ? 'is-active' : ''}><small>CONTROL 01</small><h2>Invitación y carga de video</h2><p>Al activarla, Bratty verá la explicación y podrá subir o reemplazar su video después de acceder con la cuenta especial. Al cerrarla verá el mensaje para volver el 25 de septiembre.</p><button type="button" disabled={busy || experience.loading} onClick={() => void update({ invitationActive: !experience.settings.invitationActive })}>{experience.settings.invitationActive ? 'Desactivar invitación' : 'Activar invitación'}</button><b>{experience.settings.invitationActive ? 'ACTIVA' : 'PAUSADA'}</b></article>
      <article className={experience.settings.surpriseActive ? 'is-active' : ''}><small>CONTROL 02</small><h2>Sorpresa antes de la libreta</h2><p>Al activarla, los fans deberán reproducir el video completo antes de que aparezca la libreta. Sólo puede encenderse cuando ya existe un video guardado.</p><button type="button" disabled={busy || experience.loading || !experience.submission} onClick={() => void update({ surpriseActive: !experience.settings.surpriseActive })}>{experience.settings.surpriseActive ? 'Ocultar sorpresa' : 'Mostrar sorpresa'}</button><b>{experience.settings.surpriseActive ? 'PUBLICADA' : experience.submission ? 'LISTA PARA ACTIVAR' : 'SIN VIDEO'}</b></article>
    </section>
    <section className="bratty-admin-preview"><div><p>VIDEO RECIBIDO</p><h2>{experience.submission ? 'La sorpresa está preparada.' : 'Aún no hay un video.'}</h2>{experience.submission && <><span>{experience.submission.authorName} · {new Date(experience.submission.uploadedAt).toLocaleString('es-MX')}</span><video src={experience.submission.videoUrl} controls playsInline preload="metadata" />{experience.submission.message && <blockquote>“{experience.submission.message}”</blockquote>}</>}</div><aside><p>PERMISO NECESARIO</p><strong>Usuario especial</strong><span>La cuenta de Bratty debe acceder una vez y después marcarse como “Usuario especial” desde el gestor de roles del centro administrativo.</span></aside></section>
    {message && <p className="bratty-admin-message" role="status">{message}</p>}{experience.error && <p className="bratty-admin-message" role="alert">{experience.error}</p>}
  </main>
}
