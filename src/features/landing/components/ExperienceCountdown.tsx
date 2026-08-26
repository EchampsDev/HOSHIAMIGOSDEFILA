import { useEffect, useState } from 'react'
import { FourPointMark } from '../../../components/FourPointMark'
import { experienceLaunch } from '../data/experienceLaunch'

const SECOND = 1_000
const MINUTE = SECOND * 60
const HOUR = MINUTE * 60
const DAY = HOUR * 24

function getRemainingTime(now: number) {
  const distance = Math.max(new Date(experienceLaunch.targetDate).getTime() - now, 0)
  return [
    { label: 'Días', value: Math.floor(distance / DAY) },
    { label: 'Horas', value: Math.floor((distance % DAY) / HOUR) },
    { label: 'Minutos', value: Math.floor((distance % HOUR) / MINUTE) },
    { label: 'Segundos', value: Math.floor((distance % MINUTE) / SECOND) },
  ]
}

export function ExperienceCountdown() {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), SECOND)
    return () => window.clearInterval(timer)
  }, [])

  const remaining = getRemainingTime(now)
  return <section className="experience-countdown reveal-countdown" data-scroll-reveal aria-labelledby="experience-countdown-title">
    <span className="countdown-kicker" aria-hidden="true"><FourPointMark className="countdown-four-point-mark" /> CUENTA REGRESIVA</span>
    <h2 id="experience-countdown-title">{experienceLaunch.title}</h2>
    <time className="countdown-grid" dateTime={experienceLaunch.targetDate} aria-label={`Cuenta regresiva para ${experienceLaunch.title}`}>
      {remaining.map((unit) => <span className="countdown-unit" key={unit.label}>
        <strong>{String(unit.value).padStart(2, '0')}</strong>
        <small>{unit.label}</small>
      </span>)}
    </time>
  </section>
}
