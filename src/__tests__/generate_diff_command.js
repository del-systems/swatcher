import generateDiffCommand from '../generate_diff_command'

jest.mock('../ci', () => ({
  __esModule: true,
  default: async () => ({
    baseSha: 'parent-sha',
    headSha: 'pull-request-sha'
  })
}))

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

it('should properly detect only updated screenshots and check for equalness', async () => {
  await generateDiffCommand()
})
