beforeEach(jest.resetModules)
beforeEach(jest.clearAllMocks)

it('should check for aws configuration and throw an error if configuration isnt ready', async () => {
  jest.doMock('./s3_credentials.js', () => ({
    default: jest.fn().mockReturnValue({ isConfigReady: false }),
    __esModule: true
  }))

  await expect(require('./collect_command.js').default).rejects.toThrowError()
})

it('should create a new AWS endpoint when configuration is ready', async () => {
  jest.doMock('./s3_credentials.js', () => ({
    __esModule: true,
    default: jest.fn(() => ({ isConfigReady: true, endpoint: 'aws_endpoint', accessKey: 'aws_key', secretKey: 'secret' }))
  }))

  jest.doMock('aws-sdk', () => ({
    default: {
      Endpoint: jest.fn(),
      S3: jest.fn()
    },
    __esModule: true
  }))

  await require('./collect_command.js').default()

  const s3cred = require('./s3_credentials.js').default
  const aws = require('aws-sdk').default
  expect(s3cred).toHaveBeenCalledTimes(1)
  expect(aws.Endpoint).toHaveBeenCalledWith('aws_endpoint')
  expect(aws.S3).toHaveBeenCalledWith({
    endpoint: aws.Endpoint.mock.instances[0],
    accessKeyId: 'aws_key',
    secretAccessKey: 'secret'
  })
})
