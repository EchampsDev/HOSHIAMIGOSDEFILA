import { Layout } from '../components/Layout'
import { BrattypolitanExperienceLockup } from '../components/BrattypolitanWordmark'
import { FourPointMark } from '../components/FourPointMark'
import { SocialIcon, type SocialBrand } from '../components/SocialIcon'

const steps = [
  { number: '01', title: 'Nos encontramos en la fila', copy: 'El día del concierto nos reuniremos en un punto por confirmar. Busca la libreta roja y acércate con tu idea.', icon: 'pin' },
  { number: '02', title: 'Trae algo que cuente tu historia', copy: 'Puedes llevar fotos, recortes, dibujos, cartitas, stickers o escribir directamente con los materiales disponibles.', icon: 'spark' },
  { number: '03', title: 'Deja tu huella', copy: 'Decoraremos las primeras páginas entre fans. Cada recuerdo tendrá su propio espacio y será parte de una sola pieza colectiva.', icon: 'pencil' },
  { number: '04', title: 'Se lo regalamos a Bratty', copy: 'Al terminar, la libreta física se convertirá en un recuerdo hecho con tiempo, creatividad y mucho cariño de la comunidad.', icon: 'heart' },
]

const community = [
  { name: 'Danna · Nostalgia en Loop', role: 'Crea videos sobre Bratty y comparte su fan page en TikTok.', brand: 'TikTok' as SocialBrand, url: 'https://www.tiktok.com/@nostalgiaenloop?_r=1&_t=ZS-99PvKrnSdUN', action: 'Ver en TikTok' },
  { name: 'Yenni Cortés', role: 'Crea stickers y hace dibujos bonitos para la comunidad.', brand: 'Facebook' as SocialBrand, url: 'https://www.facebook.com/share/1KF7Z98Btd/?mibextid=wwXIfr', action: 'Conocer a Yenni' },
  { name: 'Grupo de fans de Bratty', role: 'Un espacio en Facebook para conversar, compartir y encontrarnos.', brand: 'Facebook' as SocialBrand, url: 'https://www.facebook.com/share/g/1CDSfGfjvu/?mibextid=wwXIfr', action: 'Ir al grupo' },
  { name: 'Comunidad en WhatsApp', role: 'Súmate al chat para coordinar la dinámica y conocer a más fans.', brand: 'WhatsApp' as SocialBrand, url: 'https://chat.whatsapp.com/EPUeAuHOQQBFrErKeerdtS?s=cl&p=i&mlu=4&ilr=4', action: 'Unirme al chat' },
  { name: 'Eduardo Campos', role: 'DEV del proyecto web, creador de experiencias dinámicas y fan de Bratty.', brand: 'Instagram' as SocialBrand, url: 'https://www.instagram.com/ecamposs_cs?igsi=ZWUxYWViZTFkc2Z3&utm_source=qr', action: 'Ver en Instagram' },
]

function StepIcon({ type }: { type: string }) {
  if (type === 'pin') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/></svg>
  if (type === 'pencil') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.3-1 10.8-10.8-3.3-3.3L5 15.7 4 20Z"/><path d="m14.8 5.9 3.3 3.3M5 15.7l3.3 3.3"/></svg>
  if (type === 'heart') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 5.7c-2-2.1-5.4-2.1-7.4 0L12 7.1l-1.4-1.4a5.1 5.1 0 0 0-7.4 0c-2 2.1-2 5.4 0 7.5L12 22l8.8-8.8c2-2.1 2-5.4 0-7.5Z"/></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c.5 5.4 1.3 8.5 3 10-1.7 1.5-2.5 4.6-3 10-.5-5.4-1.3-8.5-3-10 1.7-1.5 2.5-4.6 3-10Z"/><path d="M3 7c.3 2.7.8 4.2 2 5-1.2.8-1.7 2.3-2 5-.3-2.7-.8-4.2-2-5 1.2-.8 1.7-2.3 2-5Z"/></svg>
}

export function AboutPage() {
  return <Layout><article className="project-page">
    <header className="project-hero">
      <div className="project-hero-copy"><p className="eyebrow"><BrattypolitanExperienceLockup /> · EL PROYECTO</p><h1>Un recuerdo de la fila, hecho entre todos.</h1><p>La experiencia nace para convertir el tiempo antes del concierto en algo que podamos crear juntos: una libreta física llena de historias, dibujos y pequeñas piezas hechas por fans para Bratty.</p><span className="project-hero-note"><FourPointMark /> Tu recuerdo puede ser pequeño. Juntos hará algo enorme.</span></div>
      <figure className="project-illustration"><img src="/images/project-fans-scrapbook-v1.png" alt="Tres fans decoran una libreta con dibujos, fotografías y estrellas mientras esperan en la fila del concierto" /><span aria-hidden="true"><FourPointMark /></span></figure>
    </header>

    <section className="project-dynamic" aria-labelledby="project-dynamic-title">
      <div className="project-section-heading"><p>LA DINÁMICA</p><h2 id="project-dynamic-title">¿Cómo vamos a participar?</h2><span>Del encuentro al regalo</span></div>
      <div className="project-step-grid">{steps.map((step) => <article className="project-step" key={step.number}>
        <div className="project-step-icon"><StepIcon type={step.icon} /></div><small>{step.number}</small><h3>{step.title}</h3><p>{step.copy}</p>
      </article>)}</div>
      <aside className="project-kit"><div><FourPointMark /><span>PARA LLEVAR</span></div><p>Plumones, colores, post-its, stickers, fotos, recortes o cualquier detalle ligero que quieras sumar. También habrá materiales para quien llegue sólo con una idea.</p></aside>
    </section>

    <section className="project-community" aria-labelledby="project-community-title">
      <div className="project-section-heading"><p>PERSONAS Y COMUNIDAD</p><h2 id="project-community-title">Este proyecto se construye en compañía.</h2><span>{community.length} enlaces para conectar</span></div>
      <div className="project-community-grid">{community.map((person, index) => <a className={`project-community-card project-community-card--${person.brand.toLowerCase()}`} href={person.url} target="_blank" rel="noreferrer" key={person.name} style={{ '--card-index': index } as React.CSSProperties}>
        <span className="project-social-icon"><SocialIcon brand={person.brand} /></span><small>{person.brand}</small><h3>{person.name}</h3><p>{person.role}</p><b>{person.action} ↗</b>
      </a>)}</div>
    </section>

    <footer className="project-closing"><FourPointMark /><p>Si quieres colaborar con una idea, material o dinámica, acércate a cualquiera de estos espacios. Esta experiencia también puede llevar un pedacito de ti.</p></footer>
  </article></Layout>
}
