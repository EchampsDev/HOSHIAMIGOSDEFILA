import { Link } from 'react-router-dom'
import { BrattychartsPage } from '../components/BrattychartsPage'
import { brattychartsExploreAreas } from '../navigation'

export function BrattychartsLandingPage() {
  return <BrattychartsPage eyebrow="ARCHIVO EDITORIAL · COMUNIDAD" title="Actualidad, historias y memoria compartida." intro="El espacio editorial de Brattypolitan Experience para seguir las noticias de BRATTY y conversar como comunidad.">
    <nav className="brattycharts-section-grid" aria-label="Explorar Brattycharts">{brattychartsExploreAreas.map((area) => <Link key={area.to} to={area.to}>
      <small>{area.eyebrow}</small><strong>{area.title}</strong><span>{area.copy}</span><b>ENTRAR →</b>
    </Link>)}</nav>
  </BrattychartsPage>
}

