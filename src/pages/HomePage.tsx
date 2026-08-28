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
        <a className="landing-scroll-cue" href="#participa" aria-label="Bajar a la sección para participar"><span>DESLIZA PARA DESCUBRIR</span><i aria-hidden="true" /></a>
      </section>

      <ExperienceCountdown />

      <section className="reveal-note reveal-note-delay" data-scroll-reveal id="participa">
        <FourPointMark className="note-four-point-mark" />
        <p>Deja una parte de tu historia en la libreta virtual.</p>
        <strong>ARCHIVO COLECTIVO · MODERADO POR EL EQUIPO</strong>
      </section>

      <nav className="actions landing-actions reveal-actions" data-scroll-reveal aria-label="Explorar Brattypolitan Experience">
        <a className="button whatsapp-action" href="https://wa.me/525659229006?text=Hola%2C%20quiero%20dejar%20algo%20en%20la%20libreta%20virtual%20de%20Brattypolitan%20Experience." target="_blank" rel="noreferrer">Dejar algo vía WhatsApp</a>
        <Link className="button web-action" to="/contribute">Dejar algo aquí</Link>
        <Link className="button subtle-action" to="/album">Ver estado de la libreta</Link>
      </nav>

      <p className="landing-continue" data-scroll-reveal><span>✦</span> Sigue explorando · el archivo se construye entre todas las personas</p>

      {hasDevelopmentAccess() && <nav className="development-shortcuts reveal-actions" data-scroll-reveal aria-label="Accesos de desarrollo">
        <p>DESARROLLO LOCAL</p>
        <Link to="/admin/experiencias">Centro admin</Link>
        <Link to="/constellation-editor">Editor constelación</Link>
        <Link to="/dev/album-editor">Editor libreta</Link>
      </nav>}
    </div>
  </Layout>
}
