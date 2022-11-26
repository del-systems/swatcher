import util from 'util'
import childProcess from 'child_process'
import gulp from 'gulp'

const sedCommand = substitute => `sed -i ${process.platform === 'darwin' ? '\'\'' : '' } '${substitute}'`

export const patchStringRequire = () => (
  util.promisify(childProcess.exec)(`find node_modules -iname '*.js' -type f | xargs grep -l 'string_decoder/' | xargs ${sedCommand('s/string_decoder\\//string_decoder/g')}`)
)
export const build = () => util.promisify(childProcess.exec)('npx rollup -c')

export default gulp.series(patchStringRequire, build)
