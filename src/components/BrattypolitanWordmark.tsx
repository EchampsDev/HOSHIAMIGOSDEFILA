type WordmarkProps = {
  className?: string
}

type LockupProps = WordmarkProps & {
  stacked?: boolean
}

export function BrattypolitanWordmark({ className = '' }: WordmarkProps) {
  return <img className={`brattypolitan-wordmark${className ? ` ${className}` : ''}`} src="/images/brattypolitan-wordmark.png" alt="BRATTYPOLITAN" />
}

export function BrattypolitanExperienceLockup({ className = '', stacked = false }: LockupProps) {
  return <span className={`brattypolitan-lockup${stacked ? ' brattypolitan-lockup--stacked' : ''}${className ? ` ${className}` : ''}`} role="img" aria-label="BRATTYPOLITAN EXPERIENCE">
    <img className="brattypolitan-wordmark" src="/images/brattypolitan-wordmark.png" alt="" aria-hidden="true" />
    <span className="brattypolitan-lockup__experience" aria-hidden="true">EXPERIENCE</span>
  </span>
}
