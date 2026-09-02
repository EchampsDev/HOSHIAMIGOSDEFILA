import { type PropsWithChildren, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FourPointMark } from './FourPointMark'
import { BrattypolitanExperienceLockup } from './BrattypolitanWordmark'
import { useGoogleSession } from '../features/access/useGoogleSession'

const publicAreas = [
  { to: '/album', eyebrow: 'LECTURA', title: 'Libreta digital', copy: 'Consulta el archivo colectivo y sus recuerdos.' },
  { to: '/about', eyebrow: 'CONTEXTO', title: 'El proyecto', copy: 'Conoce la intención y el origen de la experiencia.' },
  { to: '/contribute', eyebrow: 'PARTICIPACIÓN', title: 'Dejar un recuerdo', copy: 'Escríbele o deja algo bonito a Bratty.' },
]

export function Layout({ children }: PropsWithChildren) {
  const session = useGoogleSession()
  const [isExploreOpen, setIsExploreOpen] = useState(false)
  const [isCompact, setIsCompact] = useState(false)

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsExploreOpen(false) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  useEffect(() => {
    const syncHeader = () => setIsCompact(window.scrollY > 28)
    syncHeader()
    window.addEventListener('scroll', syncHeader, { passive: true })
    return () => window.removeEventListener('scroll', syncHeader)
  }, [])

  return <main className="site-shell">
    <header className={`topbar${isCompact ? ' is-compact' : ''}`}>
      <Link to="/" className="brand"><BrattypolitanExperienceLockup /></Link>
      <nav className="topbar-actions" aria-label="Navegación">
        <button type="button" className="quiet-link explore-toggle" onClick={() => setIsExploreOpen(true)} aria-expanded={isExploreOpen} aria-controls="explore-sidebar">Explorar</button>
        {session.isConfigured && (session.user ? <button type="button" className="topbar-google" onClick={() => void session.signOut()} aria-label={`Cerrar sesión de ${session.user.displayName?.split(' ')[0] ?? 'Google'}`}><span className="topbar-google-full">Salir · {session.user.displayName?.split(' ')[0] ?? 'Google'}</span><span className="topbar-google-short">Salir</span></button> : <button type="button" className="topbar-google" onClick={() => void session.signIn()} aria-label="Accede con tu cuenta de Google"><span className="topbar-google-full">Accede con tu cuenta de Google</span><span className="topbar-google-short">Accede con Google</span></button>)}
      </nav>
    </header>
    {session.error && <p className="session-error" role="alert">{session.error}</p>}
    {children}
    <footer className="site-footer" data-scroll-reveal>
      <span>BRATTY · CDMX · 2026 <FourPointMark className="footer-four-point-mark" /></span>
      <img className="site-footer-mark" src="/images/bratty-hoshi-footer.png" alt="Símbolo HOSHI de Bratty" />
    </footer>

    <div className={`explore-drawer-layer ${isExploreOpen ? 'is-open' : ''}`} aria-hidden={!isExploreOpen}>
      <button type="button" className="explore-drawer-backdrop" tabIndex={isExploreOpen ? 0 : -1} aria-label="Cerrar explorador" onClick={() => setIsExploreOpen(false)} />
      <aside id="explore-sidebar" className="explore-drawer" aria-label="Explorar experiencias públicas" aria-modal="true" role="dialog">
        <header>
          <div><p><BrattypolitanExperienceLockup /></p><h2>EXPLORAR</h2></div>
          <button type="button" onClick={() => setIsExploreOpen(false)} aria-label="Cerrar explorador">×</button>
        </header>
        <p className="explore-drawer-intro">Un archivo colectivo para recorrer, leer y dejar recuerdos.</p>
        <p className="explore-drawer-label">EXPERIENCIAS PÚBLICAS</p>
        <nav>{publicAreas.map((area) => <Link to={area.to} key={area.to} onClick={() => setIsExploreOpen(false)}>
          <small>{area.eyebrow}</small><strong>{area.title}</strong><span>{area.copy}</span><b>ENTRAR →</b>
        </Link>)}</nav>
      </aside>
    </div>
  </main>
}
