import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const serverDirectory = resolve('dist', 'server')
const publicDirectory = resolve('dist', 'public')

await mkdir(serverDirectory, { recursive: true })
await mkdir(publicDirectory, { recursive: true })
await cp(resolve('dist', 'index.html'), resolve(publicDirectory, 'index.html'))
await cp(resolve('dist', 'assets'), resolve(publicDirectory, 'assets'), { recursive: true })

const assetNames = await readdir(resolve('dist', 'assets'))
const files = [
  ['/', resolve('dist', 'index.html'), 'text/html; charset=utf-8'],
  ['/index.html', resolve('dist', 'index.html'), 'text/html; charset=utf-8'],
  ...assetNames.map((name) => [
    `/assets/${name}`,
    resolve('dist', 'assets', name),
    name.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8',
  ]),
]
const embeddedAssets = Object.fromEntries(
  await Promise.all(files.map(async ([url, file, contentType]) => [
    url,
    { body: (await readFile(file)).toString('base64'), contentType },
  ])),
)
const worker = `const assets = ${JSON.stringify(embeddedAssets)}

export default {
  fetch(request) {
    const url = new URL(request.url)
    const asset = assets[url.pathname] ?? (!url.pathname.includes('.') ? assets['/index.html'] : null)

    if (!asset) return new Response('Not found', { status: 404 })

    const bytes = Uint8Array.from(atob(asset.body), (character) => character.charCodeAt(0))
    return new Response(bytes, {
      headers: {
        'content-type': asset.contentType,
        'cache-control': url.pathname.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
      },
    })
  },
}
`

await writeFile(resolve(serverDirectory, 'index.js'), worker)
