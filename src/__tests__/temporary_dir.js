import temporaryDir from '../temporary_dir'
import tmpPromise from 'tmp-promise'

jest.mock('tmp-promise', () => ({
  dir: jest.fn(() => Math.random)
}))

it('should create temporary directory from tmp-promise', async () => {
  const dir = await temporaryDir()
  expect(dir).toBe(tmpPromise.dir.mock.results[0].value)
})
