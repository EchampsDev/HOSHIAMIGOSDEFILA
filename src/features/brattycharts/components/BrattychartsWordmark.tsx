import { Link } from 'react-router-dom'

type BrattychartsWordmarkProps = { linked?: boolean; className?: string }

export function BrattychartsWordmark({ linked = false, className = '' }: BrattychartsWordmarkProps) {
  const wordmark = <span className={`brattycharts-wordmark ${className}`.trim()} aria-label="Brattycharts">BRATTY<br />CHARTS</span>
  return linked ? <Link className="brattycharts-wordmark-link" to="/brattycharts">{wordmark}</Link> : wordmark
}

