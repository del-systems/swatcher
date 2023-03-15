import comparePNGs from '../compare_pngs'
import path from 'path'

jest.mock('looks-same', () => {
  const original = jest.requireActual('looks-same')
  original.createDiff = jest.fn()
  return original
})

const DEFAULT_TIMEOUT = 20000 // in ms
const fixturePath = name => path.join(__dirname, '../../e2e/fixtures', name)

it('should ignore incostintent time and status bar on iPad', async () => {
  const { equal } = await comparePNGs(fixturePath('time_pad_1_pixel_ratio_2.png'), fixturePath('time_pad_2_pixel_ratio_2.png'))
  expect(equal).toBeTruthy()
}, DEFAULT_TIMEOUT)

it('should ignore incostintent time and status bar on iPad', async () => {
  const { equal } = await comparePNGs(fixturePath('time_pad_1.png'), fixturePath('time_pad_2.png'))
  expect(equal).toBeTruthy()
}, DEFAULT_TIMEOUT)

it('should ignore incostintent time and status bar on iPhone', async () => {
  const { equal } = await comparePNGs(fixturePath('time_phone_1_pixel_ratio_2.png'), fixturePath('time_phone_2_pixel_ratio_2.png'))
  expect(equal).toBeTruthy()
}, DEFAULT_TIMEOUT)
