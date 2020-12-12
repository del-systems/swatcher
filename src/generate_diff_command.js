import CI from './ci'
import S3 from './s3'
import { safeBase32Decode } from './base32'
import comparePNGs from './compare_pngs'
import reportChanges from './report_changes'

export default async function () {
  const s3 = new S3()
  const ci = await CI()

  const headPaths = await listFiles(s3, ci.headSha)
  const basePaths = await listFiles(s3, ci.baseSha)
  const addedPaths = headPaths.filter(item => !basePaths.find(i => i.fsPath === item.fsPath))
  const removedPaths = basePaths.filter(item => !headPaths.find(i => i.fsPath === item.fsPath))
  const updatedPaths = headPaths.filter(item => !!basePaths.find(i => i.fsPath === item.fsPath))

  const changedPaths = (
    await asyncMap(updatedPaths, async item => {
      let baseDownlaodedPath
      let headDownloadedPath

      try {
        baseDownlaodedPath = await s3.download(`${ci.baseSha}/${item.fullKey}`)
        headDownloadedPath = await s3.download(`${ci.headSha}/${item.fullKey}`)
      } catch (error) {
        console.warn(`Skipping file '${item.fsPath}' as it couldn't be downloaded`)
        return null
      }

      const { equal, diffPath } = await comparePNGs(baseDownlaodedPath, headDownloadedPath)
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

  let body = 'Path|Before|After|Diff\n-----|-----|-----|-----\n'
  body += removedPaths.reduce((accumulator, item) => accumulator + `${item.fsPath}|<img src='${s3.url(ci.baseSha + '/' + item.fullKey)}'>| _removed_ | _N/A_ \n`, '')
  body += addedPaths.reduce((accumulator, item) => accumulator + `${item.fsPath}| _not existed_ |<img src='${s3.url(ci.headSha + '/' + item.fullKey)}'> | _N/A_ \n`, '')
  body += changedPaths.reduce((accmulator, item) => accmulator + `${item.fsPath}|<img src='${s3.url(ci.baseSha + '/' + item.fullKey)}'>|<img src='${s3.url(ci.headSha + '/' + item.fullKey)}'>|<img src='${s3.url(item.diffKey)}'> \n`, '')
  reportChanges(body)
}

const listFiles = async (s3, sha, prefix = '') => {
  const { prefixes, keys } = await s3.list(`${sha}/${prefix}`)

  const deeperKeys = await asyncMap(prefixes, async pre => await listFiles(s3, sha, prefix + pre))
  return keys.map(key => ({ fullKey: prefix + key, fsPath: safeBase32Decode(prefix + key) })).concat(deeperKeys.flat())
}

const asyncMap = async (array, closure) => await Promise.all(array.map(closure))
