import tmpPromise from 'tmp-promise'
import fs from 'fs'
import { promisify } from 'util'

export default async () => {
  const { fd, path, cleanup } = await tmpPromise.file()
  await promisify(fs.close)(fd) // we dont need file descriptor

  return { path, cleanup }
}
