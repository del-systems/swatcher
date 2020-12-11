import CI from './ci'
import S3 from './s3'
import pathLister, { getRealPath } from './path_lister'
import isPNG from './is_png'
import { base32 } from 'rfc4648'

export default async function (dir) {
  const s3 = new S3()
  const ci = await CI()

  dir = await getRealPath(dir)
  const pngFiles = (await listPNGFiles(dir))
    .map(path => ({ path, key: `${ci.headSha}/${base32.stringify(Buffer.from(path, 'utf8'))}.png`, contentType: 'image/png' }))

  await uploadFiles(s3, pngFiles)
}

const uploadFiles = async (s3, items) => {
  for (const item of items) {
    console.log(`Uploading '${item.path}' with key '${item.key}' and content-type '${item.contentType}'...`)
    await s3.upload(item.path, item.key, item.contentType)
  }
}

const listPNGFiles = async dir => {
  const files = await pathLister(dir)
  const readFiles = await Promise.all(files.map(async path => ({ path, isPNG: await isPNG(path) })))
  return readFiles
    .filter(item => item.isPNG)
    .map(item => item.path)
}
