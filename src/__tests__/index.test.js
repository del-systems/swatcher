import { program } from 'commander'
import swatcherVersion from '../../version'
import collectCommand from '../collect_command'
import generateDiffCommand from '../generate_diff_command'
import diffLocalCommand from '../diff_local_command'

jest.mock('commander', () => {
  const mock = {}
  mock.version = jest.fn().mockReturnThis()
  mock.name = jest.fn().mockReturnThis()
  mock.description = jest.fn().mockReturnThis()
  mock.parseAsync = jest.fn(async () => { throw new Error('Failed to parse') })

  mock.command = jest.fn(() => {
    const mock = jest.fn()
    mock.command = jest.fn().mockReturnThis()
    mock.description = jest.fn().mockReturnThis()
    mock.action = jest.fn().mockReturnThis()
    return mock
  })

  return {
    __esModule: true,
    program: mock
  }
})

jest.mock('../collect_command', () => ({ __esModule: true, default: jest.fn() }))
jest.mock('../generate_diff_command', () => ({ __esModule: true, default: jest.fn() }))
jest.mock('../diff_local_command', () => ({ __esModule: true, default: jest.fn() }))

console.error = console.log
global.process.exit = jest.fn()

it('should configure commander', () => {
  require('../index.js')
  expect(program.version).toHaveBeenCalledWith(swatcherVersion)
  expect(program.name).toHaveBeenCalled()
  expect(program.description).toHaveBeenCalledTimes(1)

  expect(program.command).toHaveBeenCalledTimes(3)

  expect(program.command.mock.calls[0][0]).toMatch('collect')
  expect(program.command.mock.results[0].value.description).toHaveBeenCalledTimes(1)
  expect(program.command.mock.results[0].value.action).toHaveBeenCalledWith(collectCommand)
  expect(program.command.mock.results[0].value.action).toHaveBeenCalledTimes(1)

  expect(program.command.mock.calls[1][0]).toMatch('generate-diff')
  expect(program.command.mock.results[1].value.description).toHaveBeenCalledTimes(1)
  expect(program.command.mock.results[1].value.action).toHaveBeenCalledWith(generateDiffCommand)
  expect(program.command.mock.results[1].value.action).toHaveBeenCalledTimes(1)

  expect(program.command.mock.calls[2][0]).toMatch('diff-local')
  expect(program.command.mock.results[2].value.description).toHaveBeenCalledTimes(1)
  expect(program.command.mock.results[2].value.action).toHaveBeenCalledWith(diffLocalCommand)
  expect(program.command.mock.results[2].value.action).toHaveBeenCalledTimes(1)

  expect(program.parseAsync).toHaveBeenCalledTimes(1)
})
