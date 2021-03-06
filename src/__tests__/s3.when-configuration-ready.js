import S3 from '../s3'
import aws from 'aws-sdk'
import s3cred from '../s3_credentials'
import { __changePath } from '../temporary_dir'

beforeEach(jest.clearAllMocks)

jest.mock('../s3_credentials', () => ({
  __esModule: true,
  default: jest.fn(() => ({ isConfigReady: true, endpoint: 'aws_endpoint', accessKey: 'aws_key', secretKey: 'secret', bucketName: 'bucket', forcePathStyleBucket: 'force-style' }))
}))

jest.mock('fs', () => ({
  readFile: jest.fn((path, callback) => {
    if (path.startsWith('x:')) callback(new Error(`Error for ${path}`))
    else callback(null, Buffer.from(path))
  })
}))

jest.mock('../temporary_dir', () => {
  let pathToReturn
  return {
    __esModule: true,
    __changePath: path => { pathToReturn = path },
    default: async () => ({ path: pathToReturn })
  }
})

jest.mock('aws-sdk', () => ({
  default: {
    Endpoint: jest.fn(),
    S3: jest.fn(function () {
      this.putObject = jest.fn((params, callback) => {
        if (params.Key.startsWith('k:')) callback(new Error(`Aws error for ${params.Key}`))
        else callback(null, jest.fn())
      })

      const fakeObjects = [
        'root/1',
        'root/2/',
        'root/3',
        'root/3',
        'root/4/',
        'root/4/'
      ]

      this.listObjects = jest.fn((params, callback) => {
        if (params.Prefix.startsWith('p:')) callback(new Error(`Aws error for ${params.Prefix}`))
        else {
          const fakeItem = fakeObjects.shift()
          const isTruncated = fakeObjects.length !== 0
          const isObject = !fakeItem.endsWith('/')
          const nextMarker = fakeObjects.length === 3 ? null : fakeItem
          callback(
            null,
            {
              IsTruncated: isTruncated,
              NextMarker: nextMarker,
              Contents: isObject ? [{ Key: fakeItem }] : [],
              CommonPrefixes: isObject ? [] : [{ Prefix: fakeItem }]
            }
          )
        }
      })

      return this
    })
  },
  __esModule: true
}))

jest.mock('node-downloader-helper', () => ({
  __esModule: true,
  DownloaderHelper: jest.fn(function (url, folder) {
    const runEventCallbacks = (name, arg) => {
      this.on.mock.calls.forEach(callArgs => {
        if (callArgs[0] === name) (callArgs[1] || (() => {}))(arg)
      })
    }

    this.start = jest.fn(() => {
      if (folder.startsWith('f:')) runEventCallbacks('error', new Error(`Error for ${folder}`))
      else runEventCallbacks('end', { filePath: `filePath:${folder}` })
    })
    this.on = jest.fn()
    return this
  })
}))

it('should create a new AWS when configuration is ready', () => {
  expect(() => new S3()).not.toThrowError()
  expect(s3cred).toHaveBeenCalledTimes(1)
  expect(aws.Endpoint).toHaveBeenCalledWith('aws_endpoint')
  expect(aws.S3).toHaveBeenCalledWith({
    s3ForcePathStyle: 'force-style',
    endpoint: aws.Endpoint.mock.instances[0],
    accessKeyId: 'aws_key',
    secretAccessKey: 'secret'
  })
})

describe('download', () => {
  it('should use node-downloader-helper and forward errors if any', async () => {
    __changePath('f:/usr/tmp')
    await expect(new S3().download('example.png')).rejects.toThrowError('Error for f:/usr/tmp')
    expect(require('node-downloader-helper').DownloaderHelper).toHaveBeenCalledWith('aws_endpoint/bucket/example.png', 'f:/usr/tmp', { override: true })
    expect(require('node-downloader-helper').DownloaderHelper.mock.instances[0].start).toHaveBeenCalledTimes(1)
  })

  it('should use node-downloader-helper and return filePath when no errors', async () => {
    __changePath('/root')
    await expect(new S3().download('meme.png')).resolves.toEqual('filePath:/root')
    expect(require('node-downloader-helper').DownloaderHelper).toHaveBeenCalledWith('aws_endpoint/bucket/meme.png', '/root', { override: true })
    expect(require('node-downloader-helper').DownloaderHelper.mock.instances[0].start).toHaveBeenCalledTimes(1)
  })
})

describe('upload', () => {
  it('should rethrow errors from fs if any', async () => {
    await expect(new S3().upload('x:file')).rejects.toThrowError('x:file')
  })

  it('should rethrow errors from aws-sdk if any', async () => {
    await expect(new S3().upload('file', 'k:key')).rejects.toThrowError('k:key')
  })

  it('should return aws data if no errors occured', async () => {
    const s3 = new S3()
    await expect(s3.upload('file', 'key', 'content-type')).resolves
    expect(aws.S3.mock.instances[0].putObject.mock.calls[0][0]).toEqual({ ACL: 'public-read', Bucket: 'bucket', Key: 'key', ContentType: 'content-type', Body: Buffer.from('file') })
    expect(aws.S3.mock.instances[0].putObject.mock.calls[0].length).toEqual(2)
  })
})

describe('list', () => {
  it('should rethrow errors if any', async () => {
    await expect(new S3().list('p:prefix')).rejects.toThrowError('Aws error for p:prefix')
  })

  it('should paginate if needed and collect all objects', async () => {
    await expect(new S3().list('root/')).resolves.toEqual({
      prefixes: ['2/', '4/'],
      keys: ['1', '3']
    })

    expect(aws.S3.mock.instances[0].listObjects.mock.calls).toEqual([
      [{ Bucket: 'bucket', Delimiter: '/', Prefix: 'root/', Marker: undefined }, expect.anything()],
      [{ Bucket: 'bucket', Delimiter: '/', Prefix: 'root/', Marker: 'root/1' }, expect.anything()],
      [{ Bucket: 'bucket', Delimiter: '/', Prefix: 'root/', Marker: 'root/2/' }, expect.anything()],
      [{ Bucket: 'bucket', Delimiter: '/', Prefix: 'root/', Marker: 'root/3' }, expect.anything()],
      [{ Bucket: 'bucket', Delimiter: '/', Prefix: 'root/', Marker: 'root/3' }, expect.anything()],
      [{ Bucket: 'bucket', Delimiter: '/', Prefix: 'root/', Marker: 'root/4/' }, expect.anything()]
    ])
  })
})
