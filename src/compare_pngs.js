import looksSame from 'looks-same'
import { promisify } from 'util'
import temporary from 'tmp-promise'
import fs from 'fs'

export default async function (pngBefore, pngAfter) {
  const pixelRatio = Number(process.env.SWATCHER_PIXEL_RATIO ?? '2') || 2

  const { equal } = await promisify(looksSame)(pngBefore, pngAfter, { pixelRatio })
  if (equal) return { equal }

  const { fd, path } = await temporary.file()
  if (fd) await promisify(fs.close)(fd) // we need only path

  await promisify(looksSame.createDiff)({ reference: pngBefore, current: pngAfter, pixelRatio, diff: path })
  return { equal, diffPath: path }
}
