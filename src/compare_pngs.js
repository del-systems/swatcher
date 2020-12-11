import looksSame from 'looks-same'
import { promisify } from 'util'
import temporaryFile from './temporary_file'

export default async function (pngBefore, pngAfter) {
  const pixelRatio = Number(process.env.SWATCHER_PIXEL_RATIO ?? '2') || 2

  const { equal } = await promisify(looksSame)(pngBefore, pngAfter, { pixelRatio })
  if (equal) return { equal }

  const { path } = await temporaryFile()
  await promisify(looksSame.createDiff)({ reference: pngBefore, current: pngAfter, pixelRatio, diff: path })
  return { equal, diffPath: path }
}
