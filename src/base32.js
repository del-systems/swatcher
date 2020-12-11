import { base32 } from 'rfc4648'

const safeSplit = path => (
  path
    .split('')
    .reduce((accumulator, currentChar) => {
      if (accumulator.length % 255 === 0 && accumulator.length > 0) {
        accumulator = accumulator.concat(['/'])
      }
      accumulator = accumulator.concat([currentChar])
      return accumulator
    }, [])
    .join('')
)

const removeSlashes = path => path.replace(/\//g, '')

export const safeBase32Encode = path => safeSplit(base32.stringify(Buffer.from(path, 'utf8')))
export const safeBase32Decode = path => Buffer.from(base32.parse(removeSlashes(path))).toString('utf8')
