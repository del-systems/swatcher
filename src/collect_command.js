import CI from './ci'
import S3 from './s3'
import pathLister, { getRealPath } from './path_lister'
import isPNG from './is_png'
import { safeBase32Encode } from './base32'
import parallelPromise from './parallel_promise'

export default async function (dir, otherDirs) {
  const s3 = new S3()
  const ci = await CI()

  const dirs = await asyncMap([dir].concat(otherDirs ?? []), async d => await getRealPath(d))
  const pngFiles = (await listPNGFiles(dirs))
    .map(path => ({ path, key: `${ci.headSha}/${safeBase32Encode(path)}`, contentType: 'image/png' }))

  await uploadFiles(s3, pngFiles)
}

const uploadFiles = async (s3, items) => await parallelPromise(items, async item => {
  console.log(`Uploading '${item.path}' with key '${item.key}' and content-type '${item.contentType}'...`)
  await s3.upload(item.path, item.key, item.contentType)
})

const listPNGFiles = async dirs => {
  const files = (await asyncMap(dirs, async d => pathLister(d))).flat()
  const readFiles = await asyncMap(files, async path => ({ path, isPNG: await isPNG(path) }))
  return readFiles
    .filter(item => item.isPNG)
    .map(item => item.path)
}

const asyncMap = async (array, closure) => await Promise.all(array.map(closure))
