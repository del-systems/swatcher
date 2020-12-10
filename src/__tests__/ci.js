import CI from '../ci'

const fakeEnv = (variables) => {
  const previous = process.env
  process.env = variables

  return () => { process.env = previous }
}

describe('ci should read all available env variables', () => {
  test.each([
    /**
     * [
     *  'property of CI',
     *  { ENV_VARIABLE: 'value' },
     *  'expected value'
     *  ]
     */
    [
      'baseBranchName',
      { TRAVIS_BRANCH: 'branch' },
      'branch'
    ],
    [
      'baseBranchName',
      { TRAVIS_BRANCH: '123-фыв' },
      '123____'
    ],
    [
      'buildNumber',
      { TRAVIS_BUILD_NUMBER: '12' },
      '12'
    ],
    [
      'pullRequestBranch',
      { TRAVIS_BRANCH: 'wow' },
      undefined
    ],
    [
      'pullRequestBranch',
      { TRAVIS_PULL_REQUEST_BRANCH: '1-feature' },
      '1_feature'
    ],
    [
      'isPullRequest',
      { },
      false
    ],
    [
      'isPullRequest',
      { TRAVIS_PULL_REQUEST_BRANCH: 'something' },
      true
    ],
    [
      'isPullRequest',
      { TRAVIS_PULL_REQUEST_BRANCH: '' },
      false
    ],
    [
      'currentBranch',
      { TRAVIS_BRANCH: 'master', TRAVIS_PULL_REQUEST_BRANCH: '' },
      'master'
    ],
    [
      'currentBranch',
      { TRAVIS_BRANCH: 'master', TRAVIS_PULL_REQUEST_BRANCH: '2-feature' },
      '2_feature'
    ],
    [
      'isVariablesReady',
      {},
      false
    ],
    [
      'isVariablesReady',
      { TRAVIS_BRANCH: '' },
      false
    ],
    [
      'isVariablesReady',
      { TRAVIS_BRANCH: 'mast', TRAVIS_BUILD_NUMBER: '1' },
      true
    ],
    [
      'isVariablesReady',
      { TRAVIS_BRANCH: 'dev', TRAVIS_BUILD_NUMBER: '2', TRAVIS_PULL_REQUEST_BRANCH: 'one' },
      true
    ]
  ])('`(await CI()).%s` from %p should return %p', async (property, env, expected) => {
    afterEach(fakeEnv(env))
    await expect((await CI())[property]).toEqual(expected)
  })
})
