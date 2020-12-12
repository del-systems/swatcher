import CI from '../ci'
import { fakeEnv, fakedGithubPayload } from './test-utils'

describe('ci should read all available env variables', () => {
  test.each([
    /**
     * [
     *  'property of CI',
     *  { ENV_VARIABLE: 'value' },
     *  { github payload contents },
     *  'expected value'
     *  ]
     */
    [
      'baseSha',
      { GITHUB_EVENT_NAME: 'pull_request' },
      { base: { sha: '123' }, head: { sha: '000' } },
      '123'
    ],
    [
      'headSha',
      { GITHUB_EVENT_NAME: 'pull_request' },
      { base: { sha: '111' }, head: { sha: '0101' } },
      '0101'
    ],
    [
      'headSha',
      { GITHUB_EVENT_NAME: 'push' },
      { sha: 'bbb', parents: [{ sha: 'v' }] },
      'bbb'
    ],
    [
      'baseSha',
      { GITHUB_EVENT_NAME: 'push' },
      { sha: '12345', parents: [{ sha: 'first_parent' }, { sha: 'secondOne' }, { sha: 'third' }] },
      'first_parent'
    ]
  ])('`(await CI()).%s` from %p should return %p', async (property, env, payload, expected) => {
    const resetFakedEnvVariables = fakeEnv(env)
    const resetFakedGithubActionsPayload = await fakedGithubPayload(payload)

    await expect((await CI())[property]).toEqual(expected)

    resetFakedGithubActionsPayload()
    resetFakedEnvVariables()
  })
})

it('should throw an error when invalid GITHUB_EVENT_NAME is passed', async () => {
  const resetFakedEnvVariables = fakeEnv({ GITHUB_EVENT_NAME: 'issue_opened' })
  const resetFakedGithubActionsPayload = await fakedGithubPayload({})

  await expect(CI()).rejects.toEqual(expect.any(Error))

  resetFakedEnvVariables()
  resetFakedGithubActionsPayload()
})

it('should throw an error when GITHUB_EVENT_PATH isn\'t given', async () => {
  const resetFakedEnvVariables = fakeEnv({})

  await expect(CI()).rejects.toEqual(expect.any(Error))

  resetFakedEnvVariables()
})
