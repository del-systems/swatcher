import util from 'util'
import childProcess from 'child_process'

export default () => util.promisify(childProcess.exec)('npx webpack')
