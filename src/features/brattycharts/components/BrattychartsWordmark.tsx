import { Link } from 'react-router-dom'

type BrattychartsWordmarkProps = { linked?: boolean; className?: string }

export function BrattychartsWordmark({ linked = false, className = '' }: BrattychartsWordmarkProps) {
  const wordmark = <img className={`brattycharts-wordmark ${className}`.trim()} src="/images/brattycharts-logo.png" alt="Brattycharts" />
  return linked ? <Link className="brattycharts-wordmark-link" to="/brattycharts">{wordmark}</Link> : wordmark
}
