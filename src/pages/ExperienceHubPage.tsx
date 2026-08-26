import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'

const publicAreas = [
  { to: '/album', eyebrow: 'LECTURA', title: 'Libreta digital', copy: 'El archivo se abrirá después del evento, al consolidar los recuerdos.' },
  { to: '/about', eyebrow: 'CONTEXTO', title: 'El proyecto', copy: 'Conoce la intención y el origen de la experiencia.' },
  { to: '/contribute', eyebrow: 'PARTICIPACIÓN', title: 'Dejar un recuerdo', copy: 'La futura puerta de entrada para contribuciones de fans.' },
]

const developerAreas = [
  { to: '/dev/album-editor', eyebrow: 'EDITOR', title: 'Scrapbook Editor', copy: 'Construye las hojas, sus elementos y sus composiciones.' },
  { to: '/constellation-editor', eyebrow: 'EDITOR', title: 'Constellation Editor', copy: 'Ajusta puntos y conexiones de la silueta guía.' },
]

export function ExperienceHubPage({ admin = false }: { admin?: boolean }) {
  return <Layout><section className="experience-hub"><header><p className="eyebrow">{admin ? 'CENTRO ADMINISTRATIVO' : 'CENTRO DE EXPERIENCIAS'}</p><h1>BRATTYPOLITAN<br />EXPERIENCE</h1><p className="hub-intro">{admin ? 'Acceso a las experiencias públicas y a las herramientas de construcción del archivo.' : 'Un acceso separado para explorar las experiencias públicas del archivo.'}</p></header><section className="hub-section"><div><p>EXPERIENCIAS PÚBLICAS</p><span>Disponibles para visitar</span></div><nav className="hub-grid">{publicAreas.map((area) => <Link to={area.to} key={area.to} className="hub-card"><small>{area.eyebrow}</small><h2>{area.title}</h2><p>{area.copy}</p><b>Entrar →</b></Link>)}</nav></section>{admin && <section className="hub-section hub-development"><div><p>HERRAMIENTAS DE DESARROLLO</p><span>Acceso administrativo</span></div><nav className="hub-grid">{developerAreas.map((area) => <Link to={area.to} key={area.to} className="hub-card hub-card-editor"><small>{area.eyebrow}</small><h2>{area.title}</h2><p>{area.copy}</p><b>Abrir herramienta →</b></Link>)}</nav></section>}</section></Layout>
}
