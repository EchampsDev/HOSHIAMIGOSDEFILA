import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AlbumPage } from '../pages/AlbumPage'
import { AdminPage } from '../pages/AdminPage'
import { AboutPage } from '../pages/AboutPage'
import { SimplePageSetlistContributePage } from '../pages/SimplePageSetlistContributePage'
import { HomePage } from '../pages/HomePage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ConstellationEditorPage } from '../features/constellation-editor/ConstellationEditorPage'
import { AlbumAccessSettingsPage } from '../features/album/editor/AlbumAccessSettingsPage'
import { hasDevelopmentAccess } from '../features/access/developmentAccess'
import { useGoogleSession } from '../features/access/useGoogleSession'
import { AlbumEditorPage } from '../features/album/editor/AlbumEditorPage'
import { SetlistManagerPage } from '../features/album/editor/SetlistManagerPage'
import { ExperienceHubPage } from '../pages/ExperienceHubPage'
import { WorkspacePage } from '../pages/WorkspacePage'
import { isConstellationContributor } from '../features/access/roles'
import { NewsDetailPage } from '../pages/NewsDetailPage'
import { AdminNewsPage } from '../pages/AdminNewsPage'

const ACCESS_MINIMUM_MS = 900
const ACCESS_FADE_MS = 650

function useAccessTransition(isLoading: boolean) {
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const startedAt = useRef(0)
  const wasLoading = useRef(isLoading)
  const [phase, setPhase] = useState<'checking' | 'exiting' | 'done'>(isLoading ? 'checking' : 'done')

  useEffect(() => {
    if (isLoading) {
      startedAt.current = performance.now()
      wasLoading.current = true
      return
    }
    if (!wasLoading.current) return
    wasLoading.current = false

    let finishTimer: number | undefined
    if (reducedMotion) {
      const reducedTimer = window.setTimeout(() => setPhase('done'), 0)
      return () => window.clearTimeout(reducedTimer)
    }
    const remaining = Math.max(0, ACCESS_MINIMUM_MS - (performance.now() - startedAt.current))
    const exitTimer = window.setTimeout(() => {
      setPhase('exiting')
      finishTimer = window.setTimeout(() => setPhase('done'), ACCESS_FADE_MS)
    }, remaining)
    return () => { window.clearTimeout(exitTimer); if (finishTimer) window.clearTimeout(finishTimer) }
  }, [isLoading, reducedMotion])

  return phase
}

function AccessLoading({ exiting = false }: { exiting?: boolean }) {
  return <main className={`route-loading${exiting ? ' is-exiting' : ''}`} aria-live="polite" aria-busy="true">
    <div className="route-loading__scene">
      <span className="route-loading__star-position" aria-hidden="true">
        <span className="opening-star"><span className="opening-star__core" /></span>
      </span>
      <p>Comprobando acceso…</p>
    </div>
  </main>
}
function DevelopmentRoute({ children }: { children: ReactNode }) { const session = useGoogleSession(); if (hasDevelopmentAccess() || session.isAdmin) return <>{children}</>; if (session.isLoading) return <AccessLoading />; return <NotFoundPage /> }
function PublicRoute({ children }: { children: ReactNode }) {
  const session = useGoogleSession()
  const phase = useAccessTransition(session.isLoading)
  const content = isConstellationContributor(session.role) && !session.isAdmin ? <NotFoundPage /> : children
  return <>{content}{phase !== 'done' && <AccessLoading exiting={phase === 'exiting'} />}</>
}
function WorkshopRoute() { const session = useGoogleSession(); if (hasDevelopmentAccess() || session.isAdmin || isConstellationContributor(session.role)) return <ConstellationEditorPage workshop />; if (session.isLoading) return <AccessLoading />; return <main className="site-shell"><section className="content-card centered"><p className="eyebrow">TALLER DE CONSTELACIÓN</p><h1>Acceso para colaboradores</h1><p>{session.user ? 'Tu cuenta aún no tiene permiso. Pide a la administración que te asigne el rol Contribuyente de proyecto.' : 'Accede con Google para que el equipo pueda habilitar tu cuenta.'}</p>{session.user ? <button type="button" className="button secondary" onClick={() => void session.signOut()}>Cerrar sesión</button> : <button type="button" className="button primary" onClick={() => void session.signIn()}>Acceder con Google</button>}</section></main> }
export function AppRoutes() { return <Routes><Route path="/" element={<PublicRoute><HomePage /></PublicRoute>} /><Route path="/workspace" element={<DevelopmentRoute><WorkspacePage /></DevelopmentRoute>} /><Route path="/explorar" element={<PublicRoute><ExperienceHubPage /></PublicRoute>} /><Route path="/admin/experiencias" element={<DevelopmentRoute><ExperienceHubPage admin /></DevelopmentRoute>} /><Route path="/admin/noticias" element={<DevelopmentRoute><AdminNewsPage /></DevelopmentRoute>} /><Route path="/novedades/:slug" element={<PublicRoute><NewsDetailPage /></PublicRoute>} /><Route path="/about" element={<PublicRoute><AboutPage /></PublicRoute>} /><Route path="/contribute" element={<PublicRoute><SimplePageSetlistContributePage /></PublicRoute>} /><Route path="/album" element={<PublicRoute><AlbumPage /></PublicRoute>} /><Route path="/admin" element={<DevelopmentRoute><AdminPage /></DevelopmentRoute>} /><Route path="/constellation-editor" element={<DevelopmentRoute><ConstellationEditorPage /></DevelopmentRoute>} /><Route path="/taller-constelacion" element={<WorkshopRoute />} /><Route path="/dev/album-editor" element={<DevelopmentRoute><AlbumEditorPage /></DevelopmentRoute>} /><Route path="/dev/setlist" element={<DevelopmentRoute><SetlistManagerPage /></DevelopmentRoute>} /><Route path="/dev/album-access" element={<DevelopmentRoute><AlbumAccessSettingsPage /></DevelopmentRoute>} /><Route path="*" element={<NotFoundPage />} /></Routes> }
