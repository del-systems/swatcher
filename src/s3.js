import { S3Client, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3'
import S3credentials from './s3_credentials.js'
import fs from 'fs'
import { DownloaderHelper } from 'node-downloader-helper'
import temporaryDir from './temporary_dir'
import { promisify } from 'util'

export default class {
  constructor () {
    this._credentials = new S3credentials()
    if (!this._credentials.isConfigReady) throw new Error('S3 config isn\'t ready')

    this._awsS3 = new S3Client({
      credentials: {
        accessKeyId: this._credentials.accessKey,
        secretAccessKey: this._credentials.secretKey
      },
      forcePathStyle: this._credentials.forcePathStyleBucket,
      endpoint: this._credentials.endpoint,
      region: this._credentials.region ?? 'default-value' // https://github.com/aws/aws-sdk-js-v3/issues/1845#issuecomment-754832210'
    })
  }

  url (fullKey) {
    return `${this._credentials.endpoint}/${this._credentials.bucketName}/${fullKey}`
  }

  async download (fullKey) {
    const folder = (await temporaryDir()).path
    return new Promise((resolve, reject) => {
      const dl = new DownloaderHelper(this.url(fullKey), folder, { override: true })
      dl.on('end', downloadInfo => {
        resolve(downloadInfo.filePath)
      })
      dl.on('error', reject)
      dl.start()
    })
  }

  async _paginatedList (prefix, nextMarker) {
    const output = await this._awsS3.send(new ListObjectsV2Command({
      Bucket: this._credentials.bucketName,
      Delimiter: '/',
      ContinuationToken: nextMarker,
      Prefix: prefix
    }))

    // In AWS S3 terms `keys` are files
    const keys = output.Contents?.map(item => item.Key) ?? []
    // In AWS S3 terms `common prefixes` are directories. They are common in multiple keys
    const prefixes = output.CommonPrefixes?.map(item => item.Prefix) ?? []

    return { nextMarker: output.NextContinuationToken, keys, prefixes }
  }

  async list (prefix) {
    let nextMarker
    let keys = []
    let prefixes = []
    do {
      const data = await this._paginatedList(prefix, nextMarker)
      nextMarker = data.nextMarker
      keys = keys.concat(data.keys)
      prefixes = prefixes.concat(data.prefixes)
    } while (nextMarker)

    const unique = (v, i, a) => (a.indexOf(v) === i)

    return {
      prefixes: prefixes.map(item => item.substring(prefix.length)).filter(unique),
      keys: keys.map(item => item.substring(prefix.length)).filter(unique)
    }
  }

  async upload (filePath, key, contentType) {
    await this._awsS3.send(new PutObjectCommand({
      Body: await (promisify(fs.readFile)(filePath)),
      ContentType: contentType,
      Key: key,
      ACL: 'public-read',
      Bucket: this._credentials.bucketName
    }))
  }
}
