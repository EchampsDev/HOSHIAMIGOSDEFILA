type WordmarkProps = {
  className?: string
}

type LockupProps = WordmarkProps & {
  stacked?: boolean
}

type ExperienceWordProps = WordmarkProps & {
  decorative?: boolean
}

export function ExperienceWord({ className = '', decorative = false }: ExperienceWordProps) {
  return <span className={`experience-word${className ? ` ${className}` : ''}`} aria-hidden={decorative || undefined}>Experience</span>
}

export function BrattypolitanWordmark({ className = '' }: WordmarkProps) {
  return <img className={`brattypolitan-wordmark${className ? ` ${className}` : ''}`} src="/images/brattypolitan-wordmark.png" alt="BRATTYPOLITAN" />
}

export function BrattypolitanExperienceLockup({ className = '', stacked = false }: LockupProps) {
  return <span className={`brattypolitan-lockup${stacked ? ' brattypolitan-lockup--stacked' : ''}${className ? ` ${className}` : ''}`} role="img" aria-label="BRATTYPOLITAN EXPERIENCE">
    <img className="brattypolitan-wordmark" src="/images/brattypolitan-wordmark.png" alt="" aria-hidden="true" />
    <ExperienceWord className="brattypolitan-lockup__experience" decorative />
  </span>
}
