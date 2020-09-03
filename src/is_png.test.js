import fs from 'fs'
import isPNG from './is_png.js'

beforeEach(jest.clearAllMocks)

jest.mock('fs', () => ({
  open: jest.fn((path, mode, callback) => {
    if (path instanceof Buffer) callback(null, path)
    else if (path.startsWith('o:')) callback(new Error(`Error while opening ${path}`))
    else callback(null, `fd${path}`)
  }),
  close: jest.fn((fd, callback) => {
    if (fd instanceof Buffer) callback()
    else if (fd.startsWith('fdc:')) callback(new Error(`Error while closing ${fd}`))
    else callback()
  }),
  read: jest.fn((fd, buffer, offset, length, position, callback) => {
    if (fd instanceof Buffer) callback(null, Math.random() * 100, fd)
    else callback(new Error(`Error while reading ${fd}`))
  })
}))

it('should rethrow errors from fs open if any', async () => {
  await expect(isPNG('o:openErr')).rejects.toThrowError('Error while opening o:openErr')
  expect(fs.open.mock.calls[0][1]).toEqual('r')
})

it('should rethrow errors for fs read if any and close file', async () => {
  await expect(isPNG('r:readError')).rejects.toThrowError('Error while reading fdr:readError')
  expect(fs.close.mock.calls[0][0]).toEqual('fdr:readError')
})

it('should rethrow errors for fs close if any', async () => {
  await expect(isPNG('c:close')).rejects.toThrowError('Error while closing fdc:close')
})

it('should compare file for the PNG file magic code and return true if finds', async () => {
  let pngFile = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x11, 0x22, 0x44])
  await expect(isPNG(pngFile)).resolves.toEqual(true)

  expect(fs.open).toHaveBeenCalledTimes(1)
  expect(fs.read).toHaveBeenCalledTimes(1)
  expect(fs.close).toHaveBeenCalledTimes(1)

  pngFile = Buffer.from([0x00, 0x11, 0x22])
  await expect(isPNG(pngFile)).resolves.toEqual(false)
  expect(fs.open).toHaveBeenCalledTimes(2)
  expect(fs.read).toHaveBeenCalledTimes(2)
  expect(fs.close).toHaveBeenCalledTimes(2)
})
