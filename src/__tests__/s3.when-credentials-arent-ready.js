import S3 from '../s3'

jest.mock('../s3_credentials', () => ({
  __esModule: true,
  default: jest.fn(() => ({ isConfigReady: false }))
}))

it('should check for aws configuration and throw an error if configuration isnt ready', () => {
  expect(() => new S3()).toThrowError()
})
