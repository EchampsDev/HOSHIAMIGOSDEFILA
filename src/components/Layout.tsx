import type { PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'
import { FourPointMark } from './FourPointMark'
export function Layout({ children }: PropsWithChildren) { return <main className="site-shell"><header className="topbar"><Link to="/" className="brand">BRATTYPOLITAN EXPERIENCE</Link><Link to="/explorar" className="quiet-link">Explorar</Link></header>{children}<footer data-scroll-reveal>BRATTY · CDMX · 2026 <FourPointMark className="footer-four-point-mark" /></footer></main> }
