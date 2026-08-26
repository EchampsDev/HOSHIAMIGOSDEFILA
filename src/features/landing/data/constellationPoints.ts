export type ConstellationPointGroup = 'hair' | 'face' | 'feature' | 'body'

export type ConstellationPoint = {
  id: string
  x: number
  y: number
  size: number
  brightness?: number
  delay?: number
  group: ConstellationPointGroup
}

// Coordenadas normalizadas. Este archivo es la única fuente de la silueta:
// puede reemplazarse por una captura más precisa sin tocar el motor Canvas.
export const constellationPoints: ConstellationPoint[] = [
  { id: 'crown', x: .50, y: .075, size: 2.8, brightness: 1, delay: 0, group: 'hair' },
  { id: 'hair-top-l', x: .43, y: .088, size: 1.7, delay: .01, group: 'hair' },
  { id: 'hair-top-r', x: .57, y: .09, size: 1.8, delay: .018, group: 'hair' },
  { id: 'temple-l', x: .365, y: .125, size: 2.1, delay: .025, group: 'hair' },
  { id: 'temple-r', x: .635, y: .13, size: 2, delay: .032, group: 'hair' },
  { id: 'hair-l1', x: .315, y: .19, size: 2.5, brightness: .92, delay: .04, group: 'hair' },
  { id: 'hair-r1', x: .69, y: .20, size: 2.3, delay: .048, group: 'hair' },
  { id: 'hair-l2', x: .282, y: .285, size: 1.8, delay: .056, group: 'hair' },
  { id: 'hair-r2', x: .716, y: .30, size: 1.9, delay: .064, group: 'hair' },
  { id: 'hair-l3', x: .27, y: .39, size: 2.2, delay: .072, group: 'hair' },
  { id: 'hair-r3', x: .724, y: .41, size: 2.1, delay: .08, group: 'hair' },
  { id: 'hair-l4', x: .285, y: .50, size: 1.7, delay: .088, group: 'hair' },
  { id: 'hair-r4', x: .708, y: .515, size: 1.8, delay: .096, group: 'hair' },
  { id: 'brow-l1', x: .397, y: .245, size: 1.35, delay: .104, group: 'feature' },
  { id: 'brow-l2', x: .455, y: .232, size: 1.15, delay: .112, group: 'feature' },
  { id: 'brow-r1', x: .545, y: .235, size: 1.15, delay: .12, group: 'feature' },
  { id: 'brow-r2', x: .603, y: .25, size: 1.35, delay: .128, group: 'feature' },
  { id: 'eye-l-out', x: .39, y: .292, size: 1.55, brightness: 1, delay: .136, group: 'feature' },
  { id: 'eye-l', x: .435, y: .30, size: 2, brightness: 1, delay: .144, group: 'feature' },
  { id: 'eye-l-in', x: .468, y: .294, size: 1.2, delay: .152, group: 'feature' },
  { id: 'eye-r-in', x: .532, y: .296, size: 1.2, delay: .16, group: 'feature' },
  { id: 'eye-r', x: .565, y: .302, size: 2, brightness: 1, delay: .168, group: 'feature' },
  { id: 'eye-r-out', x: .61, y: .295, size: 1.55, brightness: 1, delay: .176, group: 'feature' },
  { id: 'cheek-l', x: .37, y: .37, size: 1.25, delay: .184, group: 'face' },
  { id: 'cheek-r', x: .63, y: .375, size: 1.25, delay: .192, group: 'face' },
  { id: 'nose-bridge', x: .501, y: .325, size: 1.1, delay: .20, group: 'feature' },
  { id: 'nose-mid', x: .493, y: .375, size: 1.25, delay: .208, group: 'feature' },
  { id: 'nose-tip', x: .51, y: .425, size: 1.75, brightness: .95, delay: .216, group: 'feature' },
  { id: 'nose-l', x: .476, y: .438, size: 1.05, delay: .224, group: 'feature' },
  { id: 'nose-r', x: .538, y: .438, size: 1.05, delay: .232, group: 'feature' },
  { id: 'lip-l', x: .432, y: .49, size: 1.25, delay: .24, group: 'feature' },
  { id: 'lip-c', x: .50, y: .478, size: 1.55, brightness: .95, delay: .248, group: 'feature' },
  { id: 'lip-r', x: .568, y: .492, size: 1.25, delay: .256, group: 'feature' },
  { id: 'lower-lip', x: .505, y: .515, size: 1.1, delay: .264, group: 'feature' },
  { id: 'jaw-l1', x: .325, y: .445, size: 1.7, delay: .27, group: 'face' },
  { id: 'jaw-l2', x: .36, y: .535, size: 1.9, delay: .276, group: 'face' },
  { id: 'chin-l', x: .43, y: .585, size: 1.45, delay: .282, group: 'face' },
  { id: 'chin', x: .505, y: .605, size: 2.2, brightness: .95, delay: .288, group: 'face' },
  { id: 'chin-r', x: .575, y: .585, size: 1.45, delay: .294, group: 'face' },
  { id: 'jaw-r2', x: .645, y: .54, size: 1.9, delay: .30, group: 'face' },
  { id: 'jaw-r1', x: .68, y: .45, size: 1.7, delay: .306, group: 'face' },
  { id: 'neck-l1', x: .415, y: .625, size: 1.65, delay: .312, group: 'body' },
  { id: 'neck-l2', x: .405, y: .70, size: 1.9, delay: .318, group: 'body' },
  { id: 'neck-r1', x: .59, y: .63, size: 1.65, delay: .324, group: 'body' },
  { id: 'neck-r2', x: .60, y: .705, size: 1.9, delay: .33, group: 'body' },
  { id: 'collar-l', x: .345, y: .745, size: 1.8, delay: .336, group: 'body' },
  { id: 'collar-r', x: .66, y: .75, size: 1.8, delay: .342, group: 'body' },
  { id: 'heart', x: .505, y: .745, size: 2.4, brightness: 1, delay: .348, group: 'body' },
  { id: 'shoulder-l1', x: .27, y: .78, size: 2.1, delay: .354, group: 'body' },
  { id: 'shoulder-l2', x: .17, y: .825, size: 2.6, brightness: .9, delay: .36, group: 'body' },
  { id: 'shoulder-r1', x: .74, y: .785, size: 2.1, delay: .366, group: 'body' },
  { id: 'shoulder-r2', x: .84, y: .83, size: 2.6, brightness: .9, delay: .372, group: 'body' },
  { id: 'torso-l1', x: .245, y: .89, size: 1.6, delay: .378, group: 'body' },
  { id: 'torso-l2', x: .315, y: .955, size: 1.9, delay: .384, group: 'body' },
  { id: 'torso-c', x: .505, y: .92, size: 1.5, delay: .39, group: 'body' },
  { id: 'torso-r1', x: .76, y: .895, size: 1.6, delay: .396, group: 'body' },
  { id: 'torso-r2', x: .69, y: .958, size: 1.9, delay: .402, group: 'body' },
]
