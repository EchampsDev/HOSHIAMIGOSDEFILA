import { type PropsWithChildren, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FourPointMark } from './FourPointMark'
import { BrattypolitanExperienceLockup } from './BrattypolitanWordmark'
import { useGoogleSession } from '../features/access/useGoogleSession'
import { isConstellationContributor } from '../features/access/roles'
import { AdminNotificationCenter } from '../features/contributions/components/AdminNotificationCenter'
import { brattychartsExploreAreas } from '../features/brattycharts/navigation'
import { BrattychartsWordmark } from '../features/brattycharts/components/BrattychartsWordmark'

const publicAreas = [
  { to: '/album', eyebrow: 'LECTURA', title: 'Libreta digital', copy: 'Consulta el archivo colectivo y sus recuerdos.' },
  { to: '/about', eyebrow: 'CONTEXTO', title: 'El proyecto', copy: 'Conoce la intención y el origen de la experiencia.' },
  { to: '/contribute', eyebrow: 'PARTICIPACIÓN', title: 'Dejar un recuerdo', copy: 'Escríbele o deja algo bonito a Bratty.' },
  { to: '/coleccion', eyebrow: 'ARCHIVO VISUAL', title: 'Colección', copy: 'Explora los stickers por grupos, autoría e historia.' },
]

export function Layout({ children }: PropsWithChildren) {
  return <>{children}<footer className="site-footer" data-scroll-reveal>
    <span>BRATTY · CDMX · 2026 <FourPointMark className="footer-four-point-mark" /></span>
    <span className="site-footer-mark" role="img" aria-label="Símbolo HOSHI de Bratty" />
  </footer></>
}

export function AppChrome({ children }: PropsWithChildren) {
  const location = useLocation()
  const session = useGoogleSession()
  const [isExploreOpen, setIsExploreOpen] = useState(false)
  const [isCompact, setIsCompact] = useState(false)
  const isBrattycharts = location.pathname === '/brattycharts' || location.pathname.startsWith('/brattycharts/')
  const exploreAreas = isBrattycharts ? brattychartsExploreAreas : publicAreas

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
  useEffect(() => {
    if (!isExploreOpen) return
    const scrollY = window.scrollY
    const root = document.documentElement
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    const previous = { rootOverflow: root.style.overflow, bodyOverflow: document.body.style.overflow, bodyTouchAction: document.body.style.touchAction, viewportHeight: root.style.getPropertyValue('--explore-viewport-height'), themeColor: themeColor?.content }
    const syncViewportHeight = () => root.style.setProperty('--explore-viewport-height', `${window.visualViewport?.height ?? window.innerHeight}px`)
    syncViewportHeight()
    root.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
    themeColor?.setAttribute('content', '#3128d4')
    window.visualViewport?.addEventListener('resize', syncViewportHeight)
    window.visualViewport?.addEventListener('scroll', syncViewportHeight)
    return () => {
      window.visualViewport?.removeEventListener('resize', syncViewportHeight)
      window.visualViewport?.removeEventListener('scroll', syncViewportHeight)
      root.style.overflow = previous.rootOverflow
      document.body.style.overflow = previous.bodyOverflow
      document.body.style.touchAction = previous.bodyTouchAction
      if (previous.viewportHeight) root.style.setProperty('--explore-viewport-height', previous.viewportHeight)
      else root.style.removeProperty('--explore-viewport-height')
      if (themeColor && previous.themeColor) themeColor.setAttribute('content', previous.themeColor)
      window.requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: 'instant' }))
    }
  }, [isExploreOpen])

  return <div className="site-shell">
    <header className={`topbar${isCompact ? ' is-compact' : ''}`}>
      <Link to={isBrattycharts ? '/brattycharts' : '/'} className="brand">{isBrattycharts ? <BrattychartsWordmark /> : <BrattypolitanExperienceLockup />}</Link>
      <nav className="topbar-actions" aria-label="Navegación">
        <button type="button" className="quiet-link explore-toggle" onClick={() => setIsExploreOpen(true)} aria-expanded={isExploreOpen} aria-controls="explore-sidebar">Explorar</button>
        {isBrattycharts ? <Link className="quiet-link" to="/brattycharts/notificaciones">Notificaciones</Link> : session.isAdmin && <AdminNotificationCenter />}
        {session.isAdmin && <Link className="quiet-link" to={isBrattycharts ? '/brattycharts/herramientas' : '/admin/experiencias'}>Herramientas</Link>}
        {!session.isAdmin && isConstellationContributor(session.role) && <Link className="quiet-link" to="/taller-constelacion">Editor</Link>}
        {session.isConfigured && (session.user ? <button type="button" className="topbar-google" onClick={() => void session.signOut()} aria-label={`Cerrar sesión de ${session.user.displayName?.split(' ')[0] ?? 'Google'}`}><span className="topbar-google-full">Salir · {session.user.displayName?.split(' ')[0] ?? 'Google'}</span><span className="topbar-google-short">Salir</span></button> : <button type="button" className="topbar-google" onClick={() => void session.signIn()} aria-label="Accede con tu cuenta de Google"><span className="topbar-google-full">Accede con tu cuenta de Google</span><span className="topbar-google-short">Accede con Google</span></button>)}
      </nav>
    </header>
    {session.error && <p className="session-error" role="alert">{session.error}</p>}
    {children}
    <div className={`explore-drawer-layer ${isExploreOpen ? 'is-open' : ''}`} aria-hidden={!isExploreOpen}>
      <button type="button" className="explore-drawer-backdrop" tabIndex={isExploreOpen ? 0 : -1} aria-label="Cerrar explorador" onClick={() => setIsExploreOpen(false)} />
      <aside id="explore-sidebar" className="explore-drawer" aria-label="Explorar experiencias públicas" aria-modal="true" role="dialog">
        <header>
          <div><p>{isBrattycharts ? <BrattychartsWordmark /> : <BrattypolitanExperienceLockup />}</p><h2>EXPLORAR</h2></div>
          <button type="button" onClick={() => setIsExploreOpen(false)} aria-label="Cerrar explorador">×</button>
        </header>
        <p className="explore-drawer-intro">{isBrattycharts ? 'Actualidad, editoriales y comunidad alrededor de BRATTY.' : 'Un archivo colectivo para recorrer, leer y dejar recuerdos.'}</p>
        <p className="explore-drawer-label">{isBrattycharts ? 'COLECCIÓN' : 'EXPERIENCIAS PÚBLICAS'}</p>
        <nav>{exploreAreas.map((area) => <Link to={area.to} key={area.to} onClick={() => setIsExploreOpen(false)}>
          <small>{area.eyebrow}</small><strong>{area.title}</strong><span>{area.copy}</span><b>ENTRAR →</b>
        </Link>)}</nav>
      </aside>
    </div>
  </div>
}
