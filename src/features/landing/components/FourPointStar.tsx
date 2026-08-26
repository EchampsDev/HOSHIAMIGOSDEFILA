type FourPointStarProps = { active: boolean }
export function FourPointStar({ active }: FourPointStarProps) { return <g className={active ? 'four-point-star is-active' : 'four-point-star'}><path d="M50 69 53 75 60 78 53 81 50 88 47 81 40 78 47 75Z" /></g> }
