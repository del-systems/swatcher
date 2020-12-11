import mockedEnv from 'mocked-env'
import S3Credentials from '../s3_credentials'

describe('Credential should prioritize some keys', () => {
  test.each([
    [
      'accessKey',
      { SWATCHER_S3_ACCESS_KEY: 'swatcher_key', AWS_ACCESS_KEY: 'key not read' },
      'swatcher_key'
    ],
    [
      'accessKey',
      { typo_SWATCHER_S3_ACCESS_KEY: 'swatcher_key', AWS_ACCESS_KEY: 'access key' },
      'access key'
    ],
    [
      'secretKey',
      { SWATCHER_S3_SECRET_KEY: 'secret', AWS_SECRET_KEY: 'aws secret' },
      'secret'
    ],
    [
      'secretKey',
      { AWS_SECRET_KEY: 'not read', AWS_SECRET_ACCESS_KEY: 'secret' },
      'secret'
    ],
    [
      'secretKey',
      { AWS_SECRET_KEY: 'aws secret' },
      'aws secret'
    ],
    [
      'secretKey',
      {},
      undefined
    ],
    [
      'accessKey',
      {},
      undefined
    ],
    [
      'endpoint',
      {},
      undefined
    ],
    [
      'endpoint',
      { SWATCHER_S3_ENDPOINT: 'endpoint' },
      'endpoint'
    ],
    [
      'bucketName',
      {},
      undefined
    ],
    [
      'bucketName',
      { SWATCHER_S3_BUCKET_NAME: 'bucket name', AWS_BUCKET: 'none' },
      'bucket name'
    ],
    [
      'bucketName',
      { AWS_BUCKET: 'wow' },
      'wow'
    ],
    [
      'forcePathStyleBucket',
      {},
      false
    ],
    [
      'forcePathStyleBucket',
      { SWATCHER_S3_FORCE_PATH_STYLE_BUCKET: '1' },
      true
    ],
    [
      'forcePathStyleBucket',
      { SWATCHER_S3_FORCE_PATH_STYLE_BUCKET: '' },
      false
    ],
    [
      'endpoint',
      { AWS_REGION: 'region-us-1' },
      'https://s3.region-us-1.amazonaws.com'
    ],
    [
      'isConfigReady',
      {},
      false
    ],
    [
      'isConfigReady',
      { SWATCHER_S3_ENDPOINT: 'endpoint' },
      false
    ],
    [
      'isConfigReady',
      { SWATCHER_S3_ENDPOINT: 'endpoint', SWATCHER_S3_ACCESS_KEY: 'accesskey' },
      false
    ],
    [
      'isConfigReady',
      { SWATCHER_S3_ENDPOINT: 'endpoint', SWATCHER_S3_ACCESS_KEY: 'accessKey', SWATCHER_S3_SECRET_KEY: 'secret' },
      false
    ],
    [
      'isConfigReady',
      { SWATCHER_S3_ENDPOINT: 'endpoint', SWATCHER_S3_ACCESS_KEY: 'accessKey', SWATCHER_S3_SECRET_KEY: 'secret', SWATCHER_S3_BUCKET_NAME: 'bucket' },
      true
    ],
    [
      'isConfigReady',
      { SWATCHER_S3_REGION: 'endpoint', SWATCHER_S3_ACCESS_KEY: 'accessKey', SWATCHER_S3_SECRET_KEY: 'secret', SWATCHER_S3_BUCKET_NAME: 'bucket' },
      true
    ]
  ])('`new S3Credentials().%s` from %p should return %p', (property, env, expected) => {
    beforeEach(mockedEnv(env))
    expect(new S3Credentials()[property]).toEqual(expected)
  })
})
