import util from 'util'
import childProcess from 'child_process'
import gulp from 'gulp'
import fs from 'fs'

const makeVersionString = () => {
  const MAJOR = '0'
  const MINOR = '0'
  const PATCH = process.env.GITHUB_RUN_NUMBER ?? '1'
  return `${MAJOR}.${MINOR}.${PATCH}`
}

export const updateVersionJS = () => util.promisify(fs.writeFile)('./version.js', `export default '${makeVersionString()}'\n`)
export const buildDist = () => util.promisify(childProcess.exec)('npx webpack')
export const updatePackageJSON = () => util.promisify(childProcess.exec)(`npm version --no-git-tag-version --allow-same-version ${makeVersionString()}`)
export default gulp.series(
  updateVersionJS,
  gulp.parallel(buildDist, updatePackageJSON)
)