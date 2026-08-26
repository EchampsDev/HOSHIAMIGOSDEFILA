type FourPointStarProps = { active: boolean }

export function FourPointStar({ active }: FourPointStarProps) {
  return <span className={`four-point-star${active ? ' is-active' : ''}`}>
    <span className="four-point-star__core" />
  </span>
}
