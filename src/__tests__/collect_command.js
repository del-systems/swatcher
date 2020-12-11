import CI from '../ci'
import S3 from '../s3'
import pathLister, { getRealPath } from '../path_lister'
import isPNG from '../is_png'
import collectCommand from '../collect_command'

jest.mock('../ci', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    baseSha: 'baseSha',
    headSha: 'headSha'
  }))
}))

jest.mock('../s3', () => ({
  __esModule: true,
  default: jest.fn(function () {
    this.upload = jest.fn(async () => true)

    return this
  })
}))

jest.mock('../path_lister', () => ({
  __esModule: true,
  default: jest.fn(async () => ['/home/png1', '/home/png2', '/home/exe1']),
  getRealPath: jest.fn(async () => '/home')
}))

jest.mock('../is_png', () => ({
  __esModule: true,
  default: jest.fn(async path => path.includes('png'))
}))

it('should upload only png files with relative path to dir but prefixed with ci variables', async () => {
  await collectCommand('../../')

  expect(getRealPath).toHaveBeenCalledWith('../../')
  expect(pathLister).toHaveBeenCalledWith('/home')
  expect(CI).toHaveBeenCalledTimes(1)
  expect(S3).toHaveBeenCalledTimes(1)
  expect(S3.mock.instances[0].upload.mock.calls).toEqual([
    ['/home/png1', 'headSha/F5UG63LFF5YG4ZZR.png', 'image/png'],
    ['/home/png2', 'headSha/F5UG63LFF5YG4ZZS.png', 'image/png']
  ])
  expect(isPNG.mock.calls).toEqual([
    ['/home/png1'],
    ['/home/png2'],
    ['/home/exe1']
  ])
})
