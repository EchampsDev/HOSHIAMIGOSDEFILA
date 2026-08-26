type Props = { cover?: boolean }

export function SpiralBinding({ cover = false }: Props) {
  return <span className={`spiral-binding${cover ? ' is-cover' : ''}`} aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} />)}</span>
}
