import type { PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'
export function Layout({ children }: PropsWithChildren) { return <main className="site-shell"><header className="topbar"><Link to="/" className="brand">HOSHI<span>✦</span></Link><Link to="/about" className="quiet-link">El proyecto</Link></header>{children}<footer>BRATTY · CDMX · 2026 <span aria-hidden="true">✦</span></footer></main> }
