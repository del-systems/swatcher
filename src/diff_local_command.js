import { getRealPath } from './path_lister'
import comparePNGs from './compare_pngs'
import isPNG from './is_png'
import path from 'path'

const checkFile = async file => {
  if (!await isPNG(file)) throw new Error(`File at path '${file}' isn't recognized as PNG file`)
}

export default async (fileA, fileB, outputFile) => {
  fileA = await getRealPath(fileA)
  fileB = await getRealPath(fileB)
  const fileName = path.basename(outputFile)
  outputFile = await getRealPath(path.dirname(outputFile))

  await checkFile(fileA)
  await checkFile(fileB)

  const { equal } = await comparePNGs(fileA, fileB, path.join(outputFile, fileName))
  if (equal) {
    console.warn('Comparing equal files, exiting with code 2')
    process.exit(2)
  }
}
