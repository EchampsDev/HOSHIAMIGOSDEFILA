import { cp, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const serverDirectory = resolve('dist', 'server')
const publicDirectory = resolve('dist', 'public')
const worker = `export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request)
    const url = new URL(request.url)

    if (response.status !== 404 || url.pathname.includes('.')) {
      return response
    }

    return env.ASSETS.fetch(new Request(new URL('/index.html', url), request))
  },
}
`

await mkdir(serverDirectory, { recursive: true })
await mkdir(publicDirectory, { recursive: true })
await cp(resolve('dist', 'index.html'), resolve(publicDirectory, 'index.html'))
await cp(resolve('dist', 'assets'), resolve(publicDirectory, 'assets'), { recursive: true })
await writeFile(resolve(serverDirectory, 'index.js'), worker)
