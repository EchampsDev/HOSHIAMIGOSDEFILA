import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { FourPointMark } from '../components/FourPointMark'
import { hasDevelopmentAccess } from '../features/access/developmentAccess'
import { Layout } from '../components/Layout'
import { ConstellationHero } from '../features/landing/components/ConstellationHero'
import { ExperienceCountdown } from '../features/landing/components/ExperienceCountdown'
import { OpeningStar } from '../features/landing/components/OpeningStar'
import { StarfieldBackground } from '../features/landing/components/StarfieldBackground'
import { useScrollReveal } from '../features/landing/hooks/useScrollReveal'

export function HomePage() {
  const landingRef = useRef<HTMLDivElement>(null)
  useScrollReveal(landingRef)

  return <Layout>
    <StarfieldBackground />
    <div className="landing-flow" ref={landingRef}>
      <OpeningStar />

      <section className="hero">
        <div className="hero-copy reveal-title" data-scroll-reveal>
          <p className="eyebrow">UN ARCHIVO COLECTIVO</p>
          <h1>BRATTYPOLITAN<br />EXPERIENCE</h1>
        </div>
        <div className="reveal-constellation" data-scroll-reveal>
          <ConstellationHero />
        </div>
        <p className="lede reveal-lede" data-scroll-reveal>Un álbum construido por las personas<br />que estuvieron aquí.</p>
      </section>

      <ExperienceCountdown />

      <section className="reveal-note reveal-note-delay" data-scroll-reveal>
        <FourPointMark className="note-four-point-mark" />
        <p>La libreta digital se abrirá después del evento.</p>
        <strong>ARCHIVO EN CONSOLIDACIÓN</strong>
      </section>

      <nav className="actions landing-actions reveal-actions" data-scroll-reveal aria-label="Explorar Brattypolitan Experience">
        <Link className="button primary" to="/album">Ver estado de la libreta</Link>
      </nav>

      {hasDevelopmentAccess() && <nav className="development-shortcuts reveal-actions" data-scroll-reveal aria-label="Accesos de desarrollo">
        <p>DESARROLLO LOCAL</p>
        <Link to="/admin/experiencias">Centro admin</Link>
        <Link to="/constellation-editor">Editor constelación</Link>
        <Link to="/dev/album-editor">Editor libreta</Link>
      </nav>}
    </div>
  </Layout>
}
