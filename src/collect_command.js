import AWS from 'aws-sdk'
import S3Credentials from './s3_credentials.js'

export default function (dir) {
  const s3credentials = new S3Credentials()
  if (!s3credentials.isConfigReady) {
    throw new Error('S3 config isn\'t ready')
  }

  return new AWS.S3({
    endpoint: new AWS.Endpoint(s3credentials.endpoint),
    accessKeyId: s3credentials.accessKey,
    secretAccessKey: s3credentials.secretKey
  })
}
