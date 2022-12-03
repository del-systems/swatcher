import S3 from '../s3'
import { S3Client, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3'
import s3cred from '../s3_credentials'
import { __changePath } from '../temporary_dir'

beforeEach(jest.clearAllMocks)

jest.mock('../s3_credentials', () => ({
  __esModule: true,
  default: jest.fn(() => ({ isConfigReady: true, endpoint: 'aws_endpoint', accessKey: 'aws_key', secretKey: 'secret', bucketName: 'bucket', forcePathStyleBucket: 'force-style' }))
}))

jest.mock('fs', () => ({
  readFile: jest.fn((path, callback) => callback(null, Buffer.from(path)))
}))

jest.mock('../temporary_dir', () => {
  let pathToReturn
  return {
    __esModule: true,
    __changePath: path => { pathToReturn = path },
    default: async () => ({ path: pathToReturn })
  }
})

jest.mock('@aws-sdk/client-s3', () => ({
  ListObjectsV2Command: jest.fn(function (input) {
    this.__output = {
      Contents: input.ContinuationToken ? null : [{ Key: 'root/file1' }, { Key: 'root/file2' }],
      CommonPrefixes: input.ContinuationToken ? null : [{ Prefix: 'root/dir/' }],
      NextContinuationToken: input.ContinuationToken ? null : 'next-marker'
    }
  }),
  PutObjectCommand: jest.fn(),
  S3Client: jest.fn(function () {
    this.send = jest.fn(cmd => Promise.resolve(cmd.__output))
  }),
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
  expect(S3Client).toHaveBeenCalledWith({
    forcePathStyle: 'force-style',
    endpoint: 'aws_endpoint',
    region: 'default-value',
    credentials: {
      accessKeyId: 'aws_key',
      secretAccessKey: 'secret'
    }
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
  it('should return aws data if no errors occured', async () => {
    const s3 = new S3()
    await expect(s3.upload('file', 'key', 'content-type')).resolves.toBeUndefined()
    expect(PutObjectCommand).toHaveBeenCalledWith({ ACL: 'public-read', Bucket: 'bucket', Key: 'key', ContentType: 'content-type', Body: Buffer.from('file') })
  })
})

describe('list', () => {
  it('should paginate if needed and collect all objects', async () => {
    await expect(new S3().list('root/')).resolves.toEqual({
      prefixes: ['dir/'],
      keys: ['file1', 'file2']
    })

    expect(ListObjectsV2Command).toHaveBeenNthCalledWith(1, {
      Bucket: 'bucket',
      Delimiter: '/',
      ContinuationToken: undefined,
      Prefix: 'root/'
    })

    expect(ListObjectsV2Command).toHaveBeenNthCalledWith(2, {
      Bucket: 'bucket',
      Delimiter: '/',
      ContinuationToken: 'next-marker',
      Prefix: 'root/'
    })
  })
})
