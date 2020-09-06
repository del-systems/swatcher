import fs from 'fs'

async function fsOpen (path) {
  return new Promise((resolve, reject) => {
    fs.open(path, 'r', (err, fileDescriptor) => {
      if (err) reject(err)
      else resolve(fileDescriptor)
    })
  })
}

async function fsRead (fileDescriptor, requiredBytes) {
  return new Promise((resolve, reject) => {
    fs.read(fileDescriptor, Buffer.alloc(requiredBytes), 0, requiredBytes, 0, (err, readBytes, buffer) => {
      if (err) reject(err)
      else resolve(buffer)
    })
  })
}

async function fsClose (fd) {
  return new Promise((resolve, reject) => {
    fs.close(fd, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

const PNG_MAGIC_CODE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

export default async function isPNG (path) {
  const fd = await fsOpen(path)
  try {
    const fileBuffer = await fsRead(fd, PNG_MAGIC_CODE.length)
    return PNG_MAGIC_CODE.equals(fileBuffer.slice(0, PNG_MAGIC_CODE.length))
  } finally {
    await fsClose(fd)
  }
}
