import CI from './ci'
import S3 from './s3'
import { safeBase32Decode } from './base32'
import comparePNGs from './compare_pngs'
import reportChanges from './report_changes'
import parallelPromise from './parallel_promise'
import readPixelRatioFromPath from './read_pixel_ratio_from_path'

export default async function () {
  const s3 = new S3()
  const ci = await CI()

  if (!ci.baseSha) {
    console.warn('Cannot generate diffs when base SHA isn\'t available')
    return
  }

  const headPaths = await listFiles(s3, ci.headSha)
  const basePaths = await listFiles(s3, ci.baseSha)
  const addedPaths = headPaths.filter(item => !basePaths.find(i => i.fsPath === item.fsPath))
  const removedPaths = basePaths.filter(item => !headPaths.find(i => i.fsPath === item.fsPath))
  const updatedPaths = headPaths.filter(item => !!basePaths.find(i => i.fsPath === item.fsPath))

  const changedPaths = (
    await parallelPromise(updatedPaths, async item => {
      let baseDownlaodedPath
      let headDownloadedPath

      try {
        baseDownlaodedPath = await s3.download(`${ci.baseSha}/${item.fullKey}`)
        headDownloadedPath = await s3.download(`${ci.headSha}/${item.fullKey}`)
      } catch (error) {
        console.warn(`Skipping file '${item.fsPath}' as it couldn't be downloaded`)
        return null
      }

      const filePixelRatio = readPixelRatioFromPath(item.fsPath)
      const { equal, diffPath } = await comparePNGs(baseDownlaodedPath, headDownloadedPath, null, filePixelRatio)
      if (equal || !diffPath) return null

      const diffKey = `${ci.baseSha}-${ci.headSha}/${item.fullKey}`
      await s3.upload(diffPath, diffKey, 'image/png')
      return {
        ...item,
        diffKey
      }
    })
  )
    .filter(i => !!i)

  console.log('---')
  console.log('Removed')
  console.log(removedPaths)
  console.log('---')
  console.log('Added')
  console.log(addedPaths)
  console.log('---')
  console.log('Changed')
  console.log(changedPaths)

  let body = 'Before|After|Diff\n-----|-----|-----\n'
  body += removedPaths.reduce((accumulator, item) => accumulator + `<img title='${item.fsPath}' src='${s3.url(ci.baseSha + '/' + item.fullKey)}'>| _removed_ | _N/A_ \n`, '')
  body += addedPaths.reduce((accumulator, item) => accumulator + `_not existed_ |<img title='${item.fsPath}' src='${s3.url(ci.headSha + '/' + item.fullKey)}'> | _N/A_ \n`, '')
  body += changedPaths.reduce((accmulator, item) => accmulator + `<img title='${item.fsPath}' src='${s3.url(ci.baseSha + '/' + item.fullKey)}'>|<img title='${item.fsPath}' src='${s3.url(ci.headSha + '/' + item.fullKey)}'>|<img title='${item.fsPath}' src='${s3.url(item.diffKey)}'> \n`, '')
  await reportChanges(body)
}

const listFiles = async (s3, sha, prefix = '') => {
  const { prefixes, keys } = await s3.list(`${sha}/${prefix}`)

  const deeperKeys = await asyncMap(prefixes, async pre => await listFiles(s3, sha, prefix + pre))
  return keys.map(key => ({ fullKey: prefix + key, fsPath: safeBase32Decode(prefix + key) })).concat(deeperKeys.flat())
}

const asyncMap = async (array, closure) => await Promise.all(array.map(closure))
