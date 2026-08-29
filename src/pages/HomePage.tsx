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

      <ExperienceCountdown />

      <section className="reveal-note reveal-note-delay" data-scroll-reveal id="participa">
        <FourPointMark className="note-four-point-mark" />
        <p>Deja una parte de tu historia en la libreta virtual.</p>
        <strong>ARCHIVO COLECTIVO · MODERADO POR EL EQUIPO</strong>
      </section>

      <nav className="actions landing-actions reveal-actions" data-scroll-reveal aria-label="Explorar Brattypolitan Experience">
        <a className="button whatsapp-action" href="https://wa.me/525659229006?text=Hola%2C%20quiero%20dejar%20algo%20en%20la%20libreta%20virtual%20de%20Brattypolitan%20Experience." target="_blank" rel="noreferrer">ESCRÍBELE O DÉJALE ALGO BONITO A BRATTY VÍA WHATSAPP</a>
        <Link className="button web-action" to="/contribute">ESCRÍBELE O DÉJALE ALGO BONITO A BRATTY</Link>
        {albumAccess.isUnlocked && <Link className="album-entry-link" to="/album" aria-label={`Ver libreta: ${entryCount} entradas publicadas`}>
          <FourPointMark className="album-entry-mark" />
          <span>VER LIBRETA</span>
          <strong><b>{entryCount}</b> {entryCount === 1 ? 'ENTRADA' : 'ENTRADAS'}</strong>
        </Link>}
      </nav>

      <p className="landing-continue" data-scroll-reveal><span>✦</span> Sigue explorando · el archivo se construye entre todas las personas</p>

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
