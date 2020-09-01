import fs from 'fs'
import pathModule from 'path'

/**
 * Covert short or relative path to absolute
 * @param {string} path
 * @returns {Promise<string>}
 */
export async function getRealPath (path) {
  return new Promise((resolve, reject) => {
    fs.realpath(path, (err, realPath) => {
      if (err) reject(err)
      else resolve(realPath)
    })
  })
}

async function isDir (path) {
  return new Promise((resolve, reject) => {
    fs.lstat(path, (err, stats) => {
      if (err) reject(err)
      else resolve(stats.isDirectory())
    })
  })
}

async function listDir (path) {
  return new Promise((resolve, reject) => {
    fs.readdir(path, (err, files) => {
      if (err) reject(err)
      else resolve(files.map(f => pathModule.join(path, f)))
    })
  })
}

/**
 * Function for filtering out paths from traverser module
 *
 * @callback listFilesFromPathFilter
 * @param {string} fullPath - A full path to the current file or dir
 * @param {bool} isDir - Is current path resolves to a directory or not
 * @param {string} basename - Basename extracted from a fullPath
 * @return {bool} - Should current path be ignored while creating a full list

/**
 * Searchs all valid files recursively for given path. If path is a file, the file itself will be returned
 * @param {string} path - Path to look in for
 * @param {listFilesFromPathFilter} [filter] - Function to filter returned paths. By default hidden items (started with .)
 * are ignored
 * @returns {Promise<string[]>}
 */
export default async function listFilesFromPath (path, filter) {
  if (!path) throw new Error('Invalid path was given')
  filter = filter ?? ((...[, , basename]) => !basename.startsWith('.'))

  const rPath = await getRealPath(path)
  const isD = await isDir(rPath)
  if (!isD) return [rPath]
  if (!filter(rPath, isD, pathModule.basename(rPath))) return []

  const filesInDir = await listDir(rPath)

  return Promise.all(filesInDir.map(f => listFilesFromPath(f, filter)))
    .then(arr => arr.flat(Infinity))
    .then(arr => arr.filter(item => filter(item, false, pathModule.basename(item))))
}
