import looksSame from 'looks-same'
import temporaryFile, { __changeFile } from '../temporary_file'
import comparePNGs from '../compare_pngs'

jest.mock('looks-same', () => {
  const looksSame = jest.fn((pngBefore, pngAfter, options, callback) => callback(null, { equal: pngBefore === pngAfter, diffClusters: [] }))
  looksSame.createDiff = jest.fn((options, callback) => callback())
  return looksSame
})

jest.mock('../temporary_file', () => {
  let fileReturn
  return {
    default: jest.fn(async () => fileReturn),
    __esModule: true,
    __changeFile: to => { fileReturn = to }
  }
})

jest.mock('image-size', () => jest.fn((image, callback) => callback(null, { width: 10, height: 10 })))

beforeEach(jest.clearAllMocks)

describe('pixel ratio is properly read', () => {
  test.each([
    [null, 2],
    ['', 2],
    ['0', 2],
    ['1', 1],
    ['123', 123],
    ['123a', 2]
  ])('For "SWATCHER_PIXEL_RATIO=%s" enviroment variable it should resolve to %d pixel ratio', async (envVariable, expected) => {
    const envVariableBefore = process.env
    process.env = { SWATCHER_PIXEL_RATIO: envVariable }

    await expect(comparePNGs('a', 'a')).resolves.toMatchObject({ equal: true })
    expect(looksSame.mock.calls[0][2].pixelRatio).toEqual(expected)

    __changeFile({ path: '/tmp/file' })
    await expect(comparePNGs('a', 'b')).resolves.toMatchObject({ equal: false })
    expect(looksSame.createDiff.mock.calls[0][0].pixelRatio).toEqual(expected)

    process.env = envVariableBefore
  })
})

it('should properly call looksSame', async () => {
  await expect(comparePNGs('pngFile', 'pngFile')).resolves.toEqual({ equal: true })
  expect(looksSame.mock.calls[0]).toEqual(['pngFile', 'pngFile', { pixelRatio: 2, shouldCluster: true }, expect.any(Function)])

  expect(looksSame).toHaveBeenCalledTimes(1)
})

describe('it should create a temporary file when looksSame return false', () => {
  it('should close file descriptor when it\'s non-zero', async () => {
    __changeFile({ path: 'p' })

    await expect(comparePNGs('a', 'b')).resolves.toEqual({ equal: false, diffPath: 'p' })
    expect(temporaryFile).toHaveBeenCalledTimes(1)
    expect(looksSame.createDiff).toHaveBeenCalledTimes(1)
    expect(looksSame.createDiff).toHaveBeenCalledWith({ reference: 'a', current: 'b', pixelRatio: 2, diff: 'p' }, expect.any(Function))
  })

  it('shouldn\'t close file descriptor when it\'s zero', async () => {
    __changeFile({ path: 'other' })

    await expect(comparePNGs('a', 'b')).resolves.toEqual({ equal: false, diffPath: 'other' })
  })
})
