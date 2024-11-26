import reportChanges from '../report_changes'
import nodeFetch from 'node-fetch'

import { fakeEnv, fakedGithubPayload } from './test-utils'

beforeEach(jest.clearAllMocks)

jest.mock('node-fetch', () => ({
  __esModule: true,
  default: jest.fn(async (url, options) => ({
    ok: options.headers.Authorization !== 'token invalid',
    status: 200,
    statusText: 'OK',
    json: () => url === 'https://api.github.com/repos/del-systems/swatcher/issues/1/comments' && options.method !== 'POST' ? [] : { id: 'comment-id' }
  }))
}))

it('should check environment variables first', async () => {
  const resetEnvVariables = fakeEnv({})

  await reportChanges('This is body')
  expect(nodeFetch).toHaveBeenCalledTimes(0)

  resetEnvVariables()
})

it('should do nothing when event name isn\' pull_request', async () => {
  const resetEnvVariables = fakeEnv({
    GITHUB_REPOSITORY: 'del-systems/swatcher',
    SWATCHER_GITHUB_API_TOKEN: '[redacted]',
    GITHUB_API_URL: 'https://api.github.com',
    GITHUB_EVENT_NAME: 'push'
  })
  const resetGithubPayload = await fakedGithubPayload({ pull_request: { number: 1 } })

  await reportChanges('This is body')
  expect(nodeFetch).toHaveBeenCalledTimes(0)

  resetEnvVariables()
  resetGithubPayload()
})

it('should fail when url request is bad', async () => {
  const resetEnvVariables = fakeEnv({
    GITHUB_REPOSITORY: 'del-systems/swatcher',
    SWATCHER_GITHUB_API_TOKEN: 'invalid',
    GITHUB_API_URL: 'https://api.github.com',
    GITHUB_EVENT_NAME: 'pull_request'
  })
  const resetGithubPayload = await fakedGithubPayload({ pull_request: { number: 1 } })

  await expect(reportChanges('This is body')).rejects.toEqual(expect.any(Error))
  expect(nodeFetch).toHaveBeenCalledTimes(1)

  resetEnvVariables()
  resetGithubPayload()
})

it('should post a message when there are no errors', async () => {
  const resetEnvVariables = fakeEnv({
    GITHUB_REPOSITORY: 'del-systems/swatcher',
    SWATCHER_GITHUB_API_TOKEN: 'sampleToken',
    GITHUB_API_URL: 'https://api.github.com',
    GITHUB_EVENT_NAME: 'pull_request'
  })
  const resetGithubPayload = await fakedGithubPayload({ pull_request: { number: 1 } })

  await expect(reportChanges('This is body')).resolves.toBeUndefined()

  const headers = { Authorization: 'token sampleToken', Accept: 'application/vnd.github.v3+json' }
  expect(nodeFetch.mock.calls).toEqual([
    ['https://api.github.com/repos/del-systems/swatcher/issues/1/comments', { headers }],
    ['https://api.github.com/repos/del-systems/swatcher/issues/1/comments', { headers, body: expect.anything(), method: 'POST' }],
    ['https://api.github.com/repos/del-systems/swatcher/issues/comments/comment-id', { headers, body: JSON.stringify({ body: '<!--SWATCHER-->\n# [Swatcher](https://github.com/del-systems/swatcher) Report\n\nThis is body' }), method: 'PATCH' }]
  ])

  resetEnvVariables()
  resetGithubPayload()
})
