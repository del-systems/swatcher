import commander from 'commander'
import swatcherVersion from '../version.js'
import collectCommand from './collect_command.js'

jest.mock('commander', () => {
  const mock = {}
  mock.version = jest.fn().mockReturnThis()
  mock.name = jest.fn().mockReturnThis()
  mock.description = jest.fn().mockReturnThis()
  mock.parse = jest.fn()

  mock.command = jest.fn(() => {
    const mock = jest.fn()
    mock.command = jest.fn().mockReturnThis()
    mock.description = jest.fn().mockReturnThis()
    mock.action = jest.fn().mockReturnThis()
    return mock
  })

  return mock
})

jest.mock('./collect_command.js', () => ({ __esModule: true, default: jest.fn() }))

it('', () => {
  require('./index.js')
  expect(commander.version).toHaveBeenCalledWith(swatcherVersion)
  expect(commander.name).toHaveBeenCalled()
  expect(commander.description).toHaveBeenCalledTimes(1)

  expect(commander.command).toHaveBeenCalledTimes(1)
  expect(commander.command.mock.calls[0][0]).toMatch('collect')
  expect(commander.command.mock.results[0].value.description).toHaveBeenCalledTimes(1)
  expect(commander.command.mock.results[0].value.action).toHaveBeenCalledWith(collectCommand)
  expect(commander.command.mock.results[0].value.action).toHaveBeenCalledTimes(1)

  expect(commander.parse).toHaveBeenCalledTimes(1)
})
