import { Link } from 'react-router-dom'
import { ExperienceWord } from '../components/BrattypolitanWordmark'

const publicSite = 'https://brattypolitan-experience.web.app/'
const localBase = 'http://localhost:5174'

export function WorkspacePage() {
  return <main className="workspace-page">
    <header><p>BRATTYPOLITAN <ExperienceWord /></p><h1>Centro de trabajo</h1><span>Acceso rápido al sitio y a las herramientas de desarrollo.</span></header>
    <section className="workspace-links" aria-label="Accesos">
      <a href={publicSite} target="_blank" rel="noreferrer"><strong>Sitio público</strong><span>Abre la versión publicada en Firebase Hosting.</span></a>
      <a href={`${localBase}/constellation-editor`}><strong>Editor de silueta</strong><span>Importa, edita y exporta las coordenadas de la constelación.</span></a>
      <a href={`${localBase}/dev/album-editor`}><strong>Editor de libreta</strong><span>Diseña las páginas y sus recuerdos.</span></a>
      <a href={`${localBase}/dev/setlist`}><strong>Catálogo de setlist</strong><span>Sube portadas y prepara los tracks que las personas podrán seleccionar.</span></a>
    </section>
    <section className="workspace-setup">
      <h2>Preparar otra computadora</h2>
      <p>Las herramientas locales requieren una copia del repositorio y Node.js. Un sitio web no puede instalar ni iniciar programas en tu computadora por seguridad, así que estos son los únicos pasos necesarios:</p>
      <ol>
        <li>Instala la versión LTS de Node.js.</li>
        <li>Descarga o clona este repositorio desde GitHub.</li>
        <li>En la carpeta del proyecto ejecuta <code>npm install --legacy-peer-deps</code>.</li>
        <li>Inicia el entorno con <code>npm run dev -- --port 5174</code>.</li>
        <li>Vuelve a este centro y abre los editores locales.</li>
      </ol>
      <p className="workspace-note">El sitio público funciona desde cualquier dispositivo. Los enlaces locales sólo funcionarán en la computadora que tenga el entorno iniciado.</p>
    </section>
    <Link className="workspace-back" to="/">← Volver al landing</Link>
  </main>
}
