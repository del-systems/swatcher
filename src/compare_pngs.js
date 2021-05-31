import looksSame from 'looks-same'
import { promisify } from 'util'
import temporaryFile from './temporary_file'
import imageSize from 'image-size'

const isInRange = (x, b, t) => x >= b && x <= t
const areDimensionsSame = (x, y) => x.width === y.width && x.height === y.height
const handleEach = (mutatedArray, handler) => {
  for (let i = 0, l = mutatedArray.length; i < l; i++) {
    const element = mutatedArray.shift()
    if (!handler(element)) mutatedArray.push(element)
  }
}

export default async function (pngBefore, pngAfter) {
  const pixelRatio = Number(process.env.SWATCHER_PIXEL_RATIO) || 2

  const { equal, diffClusters } = await promisify(looksSame)(pngBefore, pngAfter, { pixelRatio, shouldCluster: true })
  if (equal) return { equal }

  const dimensions = await promisify(imageSize)(pngBefore)
  if (diffClusters.length !== 0 && areDimensionsSame(dimensions, await promisify(imageSize)(pngAfter))) {
    handleEach(diffClusters, cluster => {
      const indicatorHeight = (cluster.bottom - cluster.top) / pixelRatio
      const indicatorElevation = (dimensions.height - cluster.bottom) / pixelRatio

      if (isInRange(indicatorHeight, 4, 6) && isInRange(indicatorElevation, 7, 9)) {
        return true
      }
    })

    if (diffClusters.length === 0) return { equal: true }
  }

  const { path } = await temporaryFile()
  await promisify(looksSame.createDiff)({ reference: pngBefore, current: pngAfter, pixelRatio, diff: path })
  return { equal, diffPath: path }
}
