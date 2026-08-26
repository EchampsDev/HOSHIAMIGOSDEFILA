export type ConstellationPoint = { id: string; x: number; y: number; size: number; brightness?: number; delay?: number; group: 'outline' | 'feature' | 'body' }
export type ConstellationConnection = { from: string; to: string; opacity?: number; delay?: number }

export const constellationPoints: ConstellationPoint[] = [
  { id: 'crown', x: 50, y: 9, size: 2.7, delay: 0, group: 'outline' }, { id: 'temple-l', x: 35, y: 16, size: 2.1, delay: 40, group: 'outline' }, { id: 'temple-r', x: 65, y: 16, size: 2.1, delay: 70, group: 'outline' },
  { id: 'hair-l1', x: 27, y: 29, size: 2.5, delay: 110, group: 'outline' }, { id: 'hair-r1', x: 73, y: 29, size: 2.5, delay: 140, group: 'outline' }, { id: 'hair-l2', x: 24, y: 46, size: 2.1, delay: 160, group: 'outline' }, { id: 'hair-r2', x: 76, y: 46, size: 2.1, delay: 190, group: 'outline' },
  { id: 'jaw-l', x: 34, y: 58, size: 2.3, delay: 220, group: 'outline' }, { id: 'chin', x: 50, y: 65, size: 2.4, delay: 250, group: 'outline' }, { id: 'jaw-r', x: 66, y: 58, size: 2.3, delay: 280, group: 'outline' },
  { id: 'eye-l1', x: 40, y: 34, size: 1.8, delay: 310, group: 'feature' }, { id: 'eye-l2', x: 45, y: 33, size: 1.5, delay: 330, group: 'feature' }, { id: 'eye-r1', x: 55, y: 33, size: 1.5, delay: 350, group: 'feature' }, { id: 'eye-r2', x: 60, y: 34, size: 1.8, delay: 370, group: 'feature' },
  { id: 'nose-top', x: 50, y: 37, size: 1.4, delay: 390, group: 'feature' }, { id: 'nose-tip', x: 50, y: 45, size: 1.7, delay: 410, group: 'feature' }, { id: 'mouth-l', x: 44, y: 52, size: 1.4, delay: 430, group: 'feature' }, { id: 'mouth-mid', x: 50, y: 53, size: 1.5, delay: 450, group: 'feature' }, { id: 'mouth-r', x: 56, y: 52, size: 1.4, delay: 470, group: 'feature' },
  { id: 'neck-l', x: 42, y: 70, size: 2.1, delay: 490, group: 'body' }, { id: 'neck-r', x: 58, y: 70, size: 2.1, delay: 510, group: 'body' }, { id: 'shoulder-l', x: 19, y: 86, size: 2.8, delay: 530, group: 'body' }, { id: 'chest-l', x: 37, y: 80, size: 2.1, delay: 550, group: 'body' }, { id: 'heart', x: 50, y: 78, size: 2.2, delay: 570, group: 'body' }, { id: 'chest-r', x: 63, y: 80, size: 2.1, delay: 590, group: 'body' }, { id: 'shoulder-r', x: 81, y: 86, size: 2.8, delay: 610, group: 'body' },
  { id: 'body-l', x: 28, y: 96, size: 2, delay: 630, group: 'body' }, { id: 'body-r', x: 72, y: 96, size: 2, delay: 650, group: 'body' }
]

export const constellationConnections: ConstellationConnection[] = [
  ['crown','temple-l'],['crown','temple-r'],['temple-l','hair-l1'],['temple-r','hair-r1'],['hair-l1','hair-l2'],['hair-r1','hair-r2'],['hair-l2','jaw-l'],['hair-r2','jaw-r'],['jaw-l','chin'],['chin','jaw-r'],['eye-l1','eye-l2'],['eye-r1','eye-r2'],['nose-top','nose-tip'],['mouth-l','mouth-mid'],['mouth-mid','mouth-r'],['jaw-l','neck-l'],['jaw-r','neck-r'],['neck-l','chest-l'],['neck-r','chest-r'],['chest-l','heart'],['heart','chest-r'],['chest-l','shoulder-l'],['chest-r','shoulder-r'],['shoulder-l','body-l'],['shoulder-r','body-r']
].map(([from, to], index) => ({ from, to, opacity: index % 3 === 0 ? .52 : .3, delay: 680 + index * 45 }))

export const backgroundStars = [{x:8,y:12,s:1},{x:88,y:9,s:1.5},{x:14,y:66,s:1.2},{x:91,y:68,s:1},{x:7,y:88,s:1.6},{x:94,y:91,s:1.2},{x:20,y:7,s:.9},{x:82,y:40,s:1},{x:12,y:38,s:.8},{x:86,y:23,s:.8}]
