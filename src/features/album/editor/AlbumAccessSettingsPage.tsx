import { Link } from 'react-router-dom'
import { useAdminSession } from '../../access/useAdminSession'
import { usePublicAlbumAccess } from '../hooks/usePublicAlbumAccess'

export function AlbumAccessSettingsPage() {
  const session = useAdminSession()
  const access = usePublicAlbumAccess()

  return <main className="album-editor-page"><header className="album-editor-header"><div><p>HERRAMIENTA INTERNA · DESARROLLO</p><h1>Acceso a la libreta</h1></div><Link to="/">Volver al landing</Link></header><section className="album-editor-panel"><p className="album-editor-help">La libreta se activa en todos los dispositivos cuando esta opción queda abierta. Al terminar la cuenta regresiva se habilita automáticamente, aunque aquí permanezca cerrada.</p>{session.user ? <><p className="album-editor-help">Sesión admin: {session.user.email ?? session.user.uid}</p><button type="button" onClick={() => void access.setUnlocked(!access.manualUnlocked)}>{access.manualUnlocked ? 'Desactivar libreta pública' : 'Activar libreta pública'}</button><p className="album-editor-help">Estado actual: {access.isUnlocked ? 'libreta visible' : 'libreta oculta'}{access.eventEnded ? ' · activada automáticamente por fecha' : ''}{access.error ? ` · ${access.error}` : ''}</p><button type="button" onClick={() => void session.signOut()}>Cerrar sesión</button></> : <><p className="album-editor-help">Inicia sesión con una cuenta administradora para cambiar el acceso público.</p><button type="button" onClick={() => void session.signIn()}>Iniciar sesión con Google</button>{session.error && <p className="album-editor-help">{session.error}</p>}</>}</section></main>
}
