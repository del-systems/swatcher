import comparePNGs from '../compare_pngs'
import path from 'path'

jest.mock('looks-same', () => {
  const original = jest.requireActual('looks-same')
  original.createDiff = jest.fn()
  return original
})

const DEFAULT_TIMEOUT = 10000 // in ms
const fixturePath = name => path.join(__dirname, '../../e2e/fixtures', name)

it('should ignore text field carets on iphone', async () => {
  const { equal } = await comparePNGs(fixturePath('iphone-caret-1.png'), fixturePath('iphone-caret-2.png'))
  expect(equal).toBeTruthy()
}, DEFAULT_TIMEOUT)

it('should ignore text field carets on iphone but nothing else', async () => {
  const { equal } = await comparePNGs(fixturePath('iphone-caret-3.png'), fixturePath('iphone-caret-2.png'))
  expect(equal).toBeFalsy()
}, DEFAULT_TIMEOUT)

it('should ignore text field carets on ipad', async () => {
  const { equal } = await comparePNGs(fixturePath('ipad-caret-1.png'), fixturePath('ipad-caret-2.png'))
  expect(equal).toBeTruthy()
}, DEFAULT_TIMEOUT)

it('should ignore text field carets on ipad but nothing else', async () => {
  const { equal } = await comparePNGs(fixturePath('ipad-caret-3.png'), fixturePath('ipad-caret-2.png'))
  expect(equal).toBeFalsy()
}, DEFAULT_TIMEOUT)
