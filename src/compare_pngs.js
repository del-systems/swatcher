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

export default async function (pngBefore, pngAfter, outputPath, filePixelRatio) {
  const pixelRatio = Number(filePixelRatio) || Number(process.env.SWATCHER_PIXEL_RATIO) || 2

  const looksSameOptions = {
    pixelRatio,
    shouldCluster: true,
    tolerance: Number(process.env.SWATCHER_DIFF_TOLERANCE) || 5
  }
  const { equal, diffClusters } = await looksSame(pngBefore, pngAfter, looksSameOptions)
  if (equal) return { equal }

  const dimensions = await promisify(imageSize)(pngBefore)
  if (diffClusters.length !== 0 && areDimensionsSame(dimensions, await promisify(imageSize)(pngAfter))) {
    dimensions.width /= pixelRatio
    dimensions.height /= pixelRatio

    handleEach(diffClusters, cluster => {
      cluster.top /= pixelRatio
      cluster.left /= pixelRatio
      cluster.right /= pixelRatio
      cluster.bottom /= pixelRatio
      cluster.width = cluster.right - cluster.left
      cluster.height = cluster.bottom - cluster.top

      return [
        isClusterHomeIndicator(dimensions, cluster),
        isClusterTextFieldCaret(dimensions, cluster),
        isIpadStatusBarTime(dimensions, cluster),
        isIpadStatusBarBattery(dimensions, cluster),
        isPhoneStatusBarTime(dimensions, cluster),
        isPhoneStatusBarBattery(dimensions, cluster)
      ].reduce((previous, current) => previous || current, false)
    })

    if (diffClusters.length === 0) return { equal: true }
  }

  const path = outputPath ?? (await temporaryFile('.png')).path
  await looksSame.createDiff({ reference: pngBefore, current: pngAfter, pixelRatio, diff: path })
  return { equal, diffPath: path }
}

const doesClusterContains = (bigger, smaller) => (
  [
    isInRange(smaller.left, bigger.left, bigger.right),
    isInRange(smaller.top, bigger.top, bigger.bottom),
    isInRange(smaller.right, bigger.left, bigger.right),
    isInRange(smaller.bottom, bigger.top, bigger.bottom)
  ].reduce((previous, current) => previous && current, true)
)

const isClusterHomeIndicator = (dimensions, cluster) => (
  isInRange(cluster.height, 4, 6) && isInRange(dimensions.height - cluster.bottom, 7, 9)
)

const isClusterTextFieldCaret = (dimensions, cluster) => (
  isInRange(cluster.width, 0.3, 3) && isInRange(cluster.height, 15, 30)
)

const isIpadStatusBarTime = (dimensions, cluster) => (
  doesClusterContains(
    {
      left: 0,
      top: 0,
      right: 200,
      bottom: 20
    },
    cluster
  )
)

const isIpadStatusBarBattery = (dimensions, cluster) => (
  doesClusterContains(
    {
      left: dimensions.width - 110,
      top: 0,
      right: dimensions.width,
      bottom: 20
    },
    cluster
  )
)

const isPhoneStatusBarTime = (dimensions, cluster) => (
  doesClusterContains(
    {
      left: 0,
      top: 0,
      right: 90,
      bottom: 40
    },
    cluster
  )
)

const isPhoneStatusBarBattery = (dimensions, cluster) => (
  doesClusterContains(
    {
      left: dimensions.width - 110,
      top: 0,
      right: dimensions.width,
      bottom: 40
    },
    cluster
  )
)
