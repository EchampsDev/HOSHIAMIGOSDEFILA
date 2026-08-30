import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { FourPointMark } from '../components/FourPointMark'
import { useGoogleSession } from '../features/access/useGoogleSession'
import { Layout } from '../components/Layout'
import { ConstellationHero } from '../features/landing/components/ConstellationHero'
import { ExperienceCountdown } from '../features/landing/components/ExperienceCountdown'
import { OpeningStar } from '../features/landing/components/OpeningStar'
import { StarfieldBackground } from '../features/landing/components/StarfieldBackground'
import { useScrollReveal } from '../features/landing/hooks/useScrollReveal'
import { usePublicAlbumAccess } from '../features/album/hooks/usePublicAlbumAccess'
import { useAlbum } from '../features/album/hooks/useAlbum'
import { NewsLandingSection } from '../features/news/components/NewsLandingSection'

export function HomePage() {
  const landingRef = useRef<HTMLDivElement>(null)
  const albumAccess = usePublicAlbumAccess()
  const album = useAlbum(true)
  const session = useGoogleSession()
  useScrollReveal(landingRef)
  const entryCount = useMemo(() => album.album?.pages.flatMap((page) => page.elements).filter((element) => element.author.participantId !== 'developer-local').length ?? 0, [album.album])

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

      <section className="landing-chapter chapter-encounter" data-scroll-reveal>
        <p className="chapter-label">01 — EL ENCUENTRO</p>
        <ExperienceCountdown />
      </section>

      <section className="landing-chapter chapter-archive" data-scroll-reveal id="participa">
        <p className="chapter-label">02 — EL ARCHIVO</p>
        <div className="archive-intro">
          <FourPointMark className="note-four-point-mark" />
          <div><h2>Un recuerdo puede quedarse.</h2><p>Deja una parte de tu historia en la libreta virtual. El archivo colectivo se construye entre todas las personas que estuvieron ahí.</p><strong>ARCHIVO COLECTIVO · MODERADO POR EL EQUIPO</strong></div>
        </div>
        {albumAccess.isUnlocked && <Link className="album-entry-link" to="/album" aria-label={`Ver libreta: ${entryCount} entradas publicadas`}>
          <FourPointMark className="album-entry-mark" />
          <span>VER LIBRETA</span>
          <strong><b>{entryCount}</b> {entryCount === 1 ? 'ENTRADA' : 'ENTRADAS'}</strong>
        </Link>}
      </section>

      <section className="landing-chapter chapter-participate" data-scroll-reveal>
        <p className="chapter-label">03 — DEJA TU HUELLA</p>
        <h2>Hazlo parte de la historia.</h2>
        <nav className="actions landing-actions" aria-label="Participar en Brattypolitan Experience">
        <div className="landing-web-column">
          <Link className="button web-action" to="/contribute"><b>✦ DEJA ALGO EN LA LIBRETA</b><small>Forma parte del archivo colectivo</small></Link>
        </div>
        <a className="button whatsapp-action" href="https://wa.me/525659229006?text=Hola%2C%20quiero%20dejar%20algo%20en%20la%20libreta%20virtual%20de%20Brattypolitan%20Experience." target="_blank" rel="noreferrer"><b>✦ DEJA ALGO EN LA LIBRETA VÍA WHATSAPP</b><small>Y entérate de todas las novedades de BRATTY</small></a>
        </nav>
      </section>

      <div id="novedades"><NewsLandingSection /></div>

      {session.isAdmin && <nav className="development-shortcuts" aria-label="Accesos de desarrollo">
        <p>DESARROLLO LOCAL</p>
        <Link to="/admin/experiencias">Centro admin</Link>
        <Link to="/constellation-editor">Editor constelación</Link>
        <Link to="/dev/album-editor">Editor libreta</Link>
        <Link to="/dev/setlist">Setlist manager</Link>
        <Link to="/dev/album-access">Acceso libreta</Link>
      </nav>}
    </div>
  </Layout>
}
