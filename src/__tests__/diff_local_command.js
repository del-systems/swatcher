import diffLocalCommand from '../diff_local_command'
import isPNG from '../is_png'
import comparePNGs from '../compare_pngs'

jest.mock('../is_png', () => ({
  __esModule: true,
  default: jest.fn(fileName => fileName.endsWith('.png'))
}))

jest.mock('../compare_pngs', () => ({
  __esModule: true,
  default: jest.fn((fileA, fileB) => ({ equal: fileA === fileB }))
}))

jest.mock('../path_lister', () => ({
  __esModule: true,
  getRealPath: jest.fn(path => path)
}))

global.process.exit = jest.fn()

it('should fail if files aren\'t PNGs', async () => {
  await expect(diffLocalCommand('/tmp/file', '/tmp/file.png', '/tmp/output.png')).rejects.toThrow()
  await expect(diffLocalCommand('/tmp/file.png', '/tmp/file', '/tmp/output')).rejects.toThrow()

  expect(isPNG).toHaveBeenNthCalledWith(1, '/tmp/file')
  expect(isPNG).toHaveBeenNthCalledWith(3, '/tmp/file')
})

it('should exit with code 2 when files are equal', async () => {
  await expect(diffLocalCommand('/tmp/file.png', '/tmp/file.png', '/tmp/output.png')).resolves.toBeUndefined()
  expect(global.process.exit).toHaveBeenCalledWith(2)
  expect(comparePNGs).toHaveBeenCalledWith('/tmp/file.png', '/tmp/file.png', '/tmp/output.png')
})
