import temporaryFile from '../temporary_file'
import fs from 'fs'
import tmpPromise from 'tmp-promise'

jest.mock('fs', () => ({
  close: jest.fn((fd, callback) => callback(null))
}))

jest.mock('tmp-promise', () => ({
  file: jest.fn(async () => ({
    fd: Math.random(),
    path: Math.random(),
    cleanup: jest.fn()
  }))
}))

it('should create a temporary file and immediately close file descriptor', async () => {
  const { path, cleanup } = await temporaryFile()

  const mockReturnedValues = await tmpPromise.file.mock.results[0].value
  expect(fs.close).toHaveBeenCalledWith(mockReturnedValues.fd, expect.any(Function))
  expect(path).toEqual(mockReturnedValues.path)
  expect(cleanup).toBe(mockReturnedValues.cleanup)
})
