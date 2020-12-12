import AWS from 'aws-sdk'
import S3credentials from './s3_credentials.js'
import fs from 'fs'
import { DownloaderHelper } from 'node-downloader-helper'
import temporaryDir from './temporary_dir'

export default class {
  constructor () {
    this._credentials = new S3credentials()
    if (!this._credentials.isConfigReady) throw new Error('S3 config isn\'t ready')

    this._awsS3 = new AWS.S3({
      s3ForcePathStyle: this._credentials.forcePathStyleBucket,
      endpoint: new AWS.Endpoint(this._credentials.endpoint),
      accessKeyId: this._credentials.accessKey,
      secretAccessKey: this._credentials.secretKey
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
    return new Promise((resolve, reject) => {
      this._awsS3.listObjects({ Bucket: this._credentials.bucketName, Delimiter: '/', Marker: nextMarker, Prefix: prefix }, (awsError, awsData) => {
        if (awsError) reject(awsError)
        else {
          nextMarker = awsData.IsTruncated ? (awsData.NextMarker ?? awsData.Contents.slice().pop().Key) : undefined
          const keys = awsData.Contents.map(item => item.Key)
          const prefixes = awsData.CommonPrefixes.map(item => item.Prefix)
          resolve({ nextMarker, keys, prefixes })
        }
      })
    })
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
    } while (nextMarker !== undefined)

    const unique = (v, i, a) => (a.indexOf(v) === i)

    return {
      prefixes: prefixes.map(item => item.substring(prefix.length)).filter(unique),
      keys: keys.map(item => item.substring(prefix.length)).filter(unique)
    }
  }

  async upload (filePath, key, contentType) {
    return new Promise((resolve, reject) => fs.readFile(filePath, (err, buffer) => {
      if (err) reject(err)
      else {
        this._awsS3.putObject({ ACL: 'public-read', Bucket: this._credentials.bucketName, Key: key, ContentType: contentType, Body: buffer }, (awsError, awsData) => {
          if (awsError) reject(awsError)
          else resolve(awsData)
        })
      }
    }))
  }
}
