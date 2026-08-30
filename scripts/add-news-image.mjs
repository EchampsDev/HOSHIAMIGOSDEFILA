import { constants, copyFile, mkdir, stat } from 'node:fs/promises'
import { basename, extname, resolve } from 'node:path'

const [, , rawSlug, rawSource, rawName] = process.argv

if (!rawSlug || !rawSource) {
  console.error('Uso: npm run news:image -- <slug-noticia> <archivo> [nombre-destino]')
  process.exitCode = 1
} else {
  const slug = rawSlug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
  const source = resolve(rawSource)
  const sourceInfo = await stat(source).catch(() => null)
  if (!slug || !sourceInfo?.isFile()) {
    console.error('El slug o el archivo de origen no son válidos.')
    process.exitCode = 1
  } else {
    const requestedName = rawName || basename(source)
    const safeBase = requestedName.slice(0, requestedName.length - extname(requestedName).length)
      .toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
    const safeExtension = extname(requestedName).toLowerCase().replace(/[^a-z0-9.]/g, '')
    const fileName = `${safeBase || 'imagen'}${safeExtension}`
    const destinationDirectory = resolve('public', 'news', slug)
    const destination = resolve(destinationDirectory, fileName)
    await mkdir(destinationDirectory, { recursive: true })
    try {
      await copyFile(source, destination, constants.COPYFILE_EXCL)
      console.log(`Imagen añadida al repositorio: /news/${slug}/${fileName}`)
      console.log('Revisa el archivo, inclúyelo en el siguiente commit y usa esa ruta en Administración de Noticias.')
    } catch (error) {
      if (error?.code === 'EEXIST') console.error('El archivo de destino ya existe; usa otro nombre para evitar sobrescribirlo.')
      else throw error
      process.exitCode = 1
    }
  }
}
