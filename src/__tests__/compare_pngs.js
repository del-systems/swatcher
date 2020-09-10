import looksSame from 'looks-same'
import temporary from 'tmp-promise'
import fs from 'fs'
import comparePNGs from '../compare_pngs'

jest.mock('looks-same', () => {
  const looksSame = jest.fn((pngBefore, pngAfter, options, callback) => callback(null, { equal: pngBefore === pngAfter }))
  looksSame.createDiff = jest.fn((options, callback) => callback())
  return looksSame
})

jest.mock('tmp-promise', () => {
  let fileReturn
  return {
    file: jest.fn(async () => fileReturn),
    __changeFile: to => { fileReturn = to }
  }
})

jest.mock('fs', () => ({
  close: jest.fn((fd, callback) => callback())
}))

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

    temporary.__changeFile({ fd: 1, path: '/tmp/file' })
    await expect(comparePNGs('a', 'b')).resolves.toMatchObject({ equal: false })
    expect(looksSame.createDiff.mock.calls[0][0].pixelRatio).toEqual(expected)

    process.env = envVariableBefore
  })
})

it('should properly call looksSame', async () => {
  await expect(comparePNGs('pngFile', 'pngFile')).resolves.toEqual({ equal: true })
  expect(looksSame.mock.calls[0]).toEqual(['pngFile', 'pngFile', { pixelRatio: 2 }, expect.any(Function)])

  expect(looksSame).toHaveBeenCalledTimes(1)
})

describe('it should create a temporary file when looksSame return false', () => {
  it('should close file descriptor when it\'s non-zero', async () => {
    temporary.__changeFile({ fd: 1, path: 'p' })

    await expect(comparePNGs('a', 'b')).resolves.toEqual({ equal: false, diffPath: 'p' })
    expect(temporary.file).toHaveBeenCalledTimes(1)
    expect(looksSame.createDiff).toHaveBeenCalledTimes(1)
    expect(looksSame.createDiff).toHaveBeenCalledWith({ reference: 'a', current: 'b', pixelRatio: 2, diff: 'p' }, expect.any(Function))
    expect(fs.close).toHaveBeenCalledTimes(1)
    expect(fs.close).toHaveBeenCalledWith(1, expect.any(Function))
  })

  it('shouldn\'t close file descriptor when it\'s zero', async () => {
    temporary.__changeFile({ fd: 0, path: 'other' })

    await expect(comparePNGs('a', 'b')).resolves.toEqual({ equal: false, diffPath: 'other' })
    expect(fs.close).toHaveBeenCalledTimes(0)
  })
})
