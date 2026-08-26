export type ConstellationConnection = {
  from: string
  to: string
  opacity?: number
  delay?: number
}

const paths = [
  ['crown', 'hair-top-l', 'temple-l', 'hair-l1', 'hair-l2', 'hair-l3', 'hair-l4', 'jaw-l1', 'jaw-l2', 'chin-l', 'chin', 'chin-r', 'jaw-r2', 'jaw-r1', 'hair-r4', 'hair-r3', 'hair-r2', 'hair-r1', 'temple-r', 'hair-top-r', 'crown'],
  ['brow-l1', 'brow-l2'], ['brow-r1', 'brow-r2'],
  ['eye-l-out', 'eye-l', 'eye-l-in'], ['eye-r-in', 'eye-r', 'eye-r-out'],
  ['nose-bridge', 'nose-mid', 'nose-tip', 'nose-l'], ['nose-tip', 'nose-r'],
  ['lip-l', 'lip-c', 'lip-r'], ['lip-c', 'lower-lip'],
  ['jaw-l2', 'neck-l1', 'neck-l2', 'collar-l', 'shoulder-l1', 'shoulder-l2', 'torso-l1', 'torso-l2'],
  ['jaw-r2', 'neck-r1', 'neck-r2', 'collar-r', 'shoulder-r1', 'shoulder-r2', 'torso-r1', 'torso-r2'],
  ['collar-l', 'heart', 'collar-r'], ['heart', 'torso-c'],
] as const

export const constellationConnections: ConstellationConnection[] = paths.flatMap((path, pathIndex) =>
  path.slice(0, -1).map((from, index) => ({
    from,
    to: path[index + 1],
    opacity: pathIndex === 0 ? .34 : .24,
    delay: (pathIndex * .018 + index * .009) % .22,
  })),
)
