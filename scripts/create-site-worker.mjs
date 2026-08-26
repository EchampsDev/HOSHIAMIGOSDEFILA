import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const serverDirectory = resolve('dist', 'server')
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
await writeFile(resolve(serverDirectory, 'index.js'), worker)
