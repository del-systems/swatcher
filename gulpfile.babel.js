import util from 'util'
import childProcess from 'child_process'
import gulp from 'gulp'

export const build = () => util.promisify(childProcess.exec)('npx rollup -c')

export default gulp.series(build)
