import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
export function NotFoundPage() { return <Layout><section className="content-card centered"><p className="eyebrow">404</p><h1>Esta estrella no está en el mapa.</h1><Link className="button primary" to="/">Volver al inicio</Link></section></Layout> }
