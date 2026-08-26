type FourPointMarkProps = { className?: string }

export function FourPointMark({ className = '' }: FourPointMarkProps) {
  return <span className={`four-point-mark ${className}`.trim()} aria-hidden="true" />
}
