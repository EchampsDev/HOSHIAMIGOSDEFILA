import { type ReactNode } from 'react'
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

function AccessLoading() { return <main className="site-shell"><p className="route-loading">Comprobando acceso…</p></main> }
function DevelopmentRoute({ children }: { children: ReactNode }) { const session = useGoogleSession(); if (hasDevelopmentAccess() || session.isAdmin) return <>{children}</>; if (session.isLoading) return <AccessLoading />; return <NotFoundPage /> }
function PublicRoute({ children }: { children: ReactNode }) { const session = useGoogleSession(); if (session.isLoading) return <AccessLoading />; if (isConstellationContributor(session.role) && !session.isAdmin) return <NotFoundPage />; return <>{children}</> }
function WorkshopRoute() { const session = useGoogleSession(); if (hasDevelopmentAccess() || session.isAdmin || isConstellationContributor(session.role)) return <ConstellationEditorPage workshop />; if (session.isLoading) return <AccessLoading />; return <main className="site-shell"><section className="content-card centered"><p className="eyebrow">TALLER DE CONSTELACIÓN</p><h1>Acceso para colaboradores</h1><p>{session.user ? 'Tu cuenta aún no tiene permiso. Pide a la administración que te asigne el rol Contribuyente de proyecto.' : 'Accede con Google para que el equipo pueda habilitar tu cuenta.'}</p>{session.user ? <button type="button" className="button secondary" onClick={() => void session.signOut()}>Cerrar sesión</button> : <button type="button" className="button primary" onClick={() => void session.signIn()}>Acceder con Google</button>}</section></main> }
export function AppRoutes() { return <Routes><Route path="/" element={<PublicRoute><HomePage /></PublicRoute>} /><Route path="/workspace" element={<DevelopmentRoute><WorkspacePage /></DevelopmentRoute>} /><Route path="/explorar" element={<PublicRoute><ExperienceHubPage /></PublicRoute>} /><Route path="/admin/experiencias" element={<DevelopmentRoute><ExperienceHubPage admin /></DevelopmentRoute>} /><Route path="/about" element={<PublicRoute><AboutPage /></PublicRoute>} /><Route path="/contribute" element={<PublicRoute><SimplePageSetlistContributePage /></PublicRoute>} /><Route path="/album" element={<PublicRoute><AlbumPage /></PublicRoute>} /><Route path="/admin" element={<DevelopmentRoute><AdminPage /></DevelopmentRoute>} /><Route path="/constellation-editor" element={<DevelopmentRoute><ConstellationEditorPage /></DevelopmentRoute>} /><Route path="/taller-constelacion" element={<WorkshopRoute />} /><Route path="/dev/album-editor" element={<DevelopmentRoute><AlbumEditorPage /></DevelopmentRoute>} /><Route path="/dev/setlist" element={<DevelopmentRoute><SetlistManagerPage /></DevelopmentRoute>} /><Route path="/dev/album-access" element={<DevelopmentRoute><AlbumAccessSettingsPage /></DevelopmentRoute>} /><Route path="*" element={<NotFoundPage />} /></Routes> }
