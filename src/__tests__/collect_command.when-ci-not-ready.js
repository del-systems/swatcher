import CI from '../ci'
import collectCommand from '../collect_command'

jest.mock('../s3')
jest.mock('../ci', () => ({
  __esModule: true,
  default: jest.fn(() => ({ isVariablesReady: false }))
}))
jest.mock('../path_lister')
jest.mock('../is_png')

it('should throw error when CI variables isn\'t ready', async () => {
  await expect(collectCommand()).rejects.toThrowError('CI variables')
  expect(CI).toHaveBeenCalledTimes(1)
})
