import listFilesFromPath from '../path_lister'

jest.mock('fs', () => ({
  realpath: jest.fn((path, callback) => {
    path = path.split('#').pop()
    if (path.startsWith('x:')) callback(new Error(`Error while computing realpath for ${path}`))
    else callback(null, `${path}`)
  }),
  lstat: jest.fn((path, callback) => {
    path = path.split('#').pop()
    if (path.startsWith('l:')) callback(new Error(`Error while reading lstat for ${path}`))
    else callback(null, { isDirectory: jest.fn(() => path.startsWith('d:')) })
  }),
  readdir: jest.fn((path, callback) => {
    path = path.split('#').pop()
    if (path.startsWith('d:r:')) callback(new Error(`Error while reading dir for ${path}`))
    else callback(null, path.split('|').slice(1))
  })
}))

jest.mock('path', () => ({
  join: jest.fn((first, second) => `${first}#${second}`),
  basename: jest.fn((path) => `b${path.split('#').pop()}`)
}))

it('should rethrow fs.realpath errors if any', async () => {
  await expect(listFilesFromPath('d:dir|file1|file2|x:file3|file4')).rejects.toThrow('Error while computing realpath for x:file3')
})

it('should rethrow fs.lstat errors if any', async () => {
  await expect(listFilesFromPath('d:dir|file1|l:dir2|file3')).rejects.toThrow('Error while reading lstat for l:dir2')
})

it('should rethrow fs.readdir errors if any', async () => {
  await expect(listFilesFromPath('d:dir|file1|file2|d:r:dir2|file3')).rejects.toThrow('Error while reading dir for d:r:dir2')
})

it('should throw error for empty path', async () => {
  await expect(listFilesFromPath('')).rejects.toThrow('Invalid path')
})

it('should call filter for each traversed path', async () => {
  const filter = jest.fn(r => !r.startsWith('filtered'))
  await expect(listFilesFromPath('d:dir|file1|file2|filteredFile3|filteredFile4|file5', filter)).resolves.toEqual([
    'file1',
    'file2',
    'file5'
  ])

  expect(filter.mock.calls).toEqual([
    ['d:dir|file1|file2|filteredFile3|filteredFile4|file5', true, 'bd:dir|file1|file2|filteredFile3|filteredFile4|file5'],
    ['file1', false, 'bfile1'],
    ['file2', false, 'bfile2'],
    ['filteredFile3', false, 'bfilteredFile3'],
    ['filteredFile4', false, 'bfilteredFile4'],
    ['file5', false, 'bfile5']
  ])
})

it('should not look into the directory if filter rejected it', async () => {
  await expect(listFilesFromPath('d:dir|file1|file2|file3', r => !r.includes('dir'))).resolves.toEqual([])
})

it('should return all items realpathed if no error occured', async () => {
  await expect(listFilesFromPath('d:dir|file1|file2|file3')).resolves.toEqual([
    'file1',
    'file2',
    'file3'
  ])
})
