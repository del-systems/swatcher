import comparePNGs from '../compare_pngs'
import path from 'path'

const DEFAULT_TIMEOUT = 30000 // in ms
const fixturePath = name => path.join(__dirname, '../../e2e/fixtures', name)

it('should ignore iOS home indicator', async () => {
  const { equal } = await comparePNGs(
    fixturePath('iphone-home-indicator-1.png'),
    fixturePath('iphone-home-indicator-2.png')
  )
  expect(equal).toBeTruthy()
}, DEFAULT_TIMEOUT)

it('should ignore iOS home indicator but nothing else', async () => {
  const { equal } = await comparePNGs(
    fixturePath('iphone-home-indicator-1.png'),
    fixturePath('iphone-home-indicator-3.png')
  )
  expect(equal).toBeFalsy()
}, DEFAULT_TIMEOUT)
