const readPrioritized = (...names) => (
  names
    .map(envName => process.env[envName])
    .reduce((result, current) => result || current, undefined)
)

export default class {
  get accessKey () {
    return readPrioritized('SWATCHER_S3_ACCESS_KEY', 'AWS_ACCESS_KEY_ID', 'AWS_ACCESS_KEY')
  }

  get secretKey () {
    return readPrioritized('SWATCHER_S3_SECRET_KEY', 'AWS_SECRET_ACCESS_KEY', 'AWS_SECRET_KEY')
  }

  get bucketName () {
    return readPrioritized('SWATCHER_S3_BUCKET_NAME', 'AWS_BUCKET')
  }

  get endpoint () {
    return readPrioritized('SWATCHER_S3_ENDPOINT', 'AWS_ENDPOINT')
  }

  get isConfigReady () {
    return !!(this.accessKey && this.bucketName && this.secretKey && this.endpoint)
  }
}
