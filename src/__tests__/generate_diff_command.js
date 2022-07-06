import generateDiffCommand from '../generate_diff_command'
import reportChanges from '../report_changes'

const ci = require('../ci')
jest.mock('../ci', () => {
  const module = {
    __esModule: true,
    __baseSha: '',
    __headSha: ''
  }

  module.default = async () => ({
    baseSha: module.__baseSha,
    headSha: module.__headSha
  })

  return module
})

jest.mock('../report_changes')

jest.mock('../base32', () => ({
  __esModule: true,
  safeBase32Decode: n => n
}))

jest.mock('../s3', () => ({
  __esModule: true,
  default: jest.fn(function () {
    const fakeTree = {
      'parent-sha/': {
        prefixes: ['f/'],
        keys: ['a', 'b', 'error']
      },
      'parent-sha/f/': {
        prefixes: [],
        keys: ['c']
      },
      'pull-request-sha/': {
        prefixes: ['f/'],
        keys: ['b', 'error']
      },
      'pull-request-sha/f/': {
        prefixes: [],
        keys: ['c', 'd']
      }
    }

    this.list = key => fakeTree[key]
    this.download = async key => {
      if (key === 'parent-sha/error') throw new Error('Download error')
      return key
    }
    this.upload = jest.fn()
    this.url = key => key

    return this
  })
}))

jest.mock('../compare_pngs', () => ({
  __esModule: true,
  default: jest.fn(async (a, b) => ({
    equal: !(a === 'parent-sha/f/c' && b === 'pull-request-sha/f/c'),
    diffPath: 'diff-path'
  }))
}))

beforeEach(jest.clearAllMocks)

it('should properly detect only updated screenshots and check for equalness', async () => {
  ci.__baseSha = 'parent-sha'
  ci.__headSha = 'pull-request-sha'
  await generateDiffCommand()

  expect(reportChanges).toHaveBeenCalledTimes(1)
})

it('should abort if base SHA cannot be detected', async () => {
  ci.__baseSha = null
  ci.__headSha = 'pull-request-sha'

  await generateDiffCommand()

  expect(reportChanges).not.toHaveBeenCalled()
})
