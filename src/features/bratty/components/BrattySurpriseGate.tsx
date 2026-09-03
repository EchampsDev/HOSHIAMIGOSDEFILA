import { useState, type ReactNode } from 'react'
import { BrattypolitanExperienceLockup } from '../../../components/BrattypolitanWordmark'
import { FourPointMark } from '../../../components/FourPointMark'
import { useBrattyExperience } from '../hooks/useBrattyExperience'

export function BrattySurpriseGate({ children }: { children: ReactNode }) {
  const experience = useBrattyExperience()
  const [complete, setComplete] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const available = experience.settings.surpriseActive && Boolean(experience.submission?.videoUrl)

  if (experience.loading) return <main className="bratty-surprise-loading" aria-busy="true"><FourPointMark /><p>Preparando la experiencia…</p></main>
  if (!available || complete) return <>{children}</>

  return <main className="bratty-surprise-gate">
    <header><p><BrattypolitanExperienceLockup /></p><span>SORPRESA PARA LA COMUNIDAD</span></header>
    <section><FourPointMark className="bratty-surprise-star" /><p className="eyebrow">ANTES DE ABRIR LA LIBRETA</p><h1>Antes de continuar, alguien les tiene preparado una sorpresa.</h1>
      {!videoError ? <video src={experience.submission!.videoUrl} controls playsInline preload="metadata" onEnded={() => setComplete(true)} onError={() => setVideoError(true)} aria-label="Mensaje de Bratty para sus fans" /> : <div className="bratty-video-error"><p>El video no pudo reproducirse en este dispositivo.</p><button type="button" onClick={() => setComplete(true)}>Continuar a la libreta</button></div>}
      {experience.submission?.message && <blockquote>“{experience.submission.message}”</blockquote>}
      <p className="bratty-surprise-help">La libreta aparecerá automáticamente cuando termine el video.</p>
    </section>
  </main>
}
