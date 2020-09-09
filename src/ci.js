const safeName = name => name?.replace(/\W/gm, '_')

const readPrioritized = (...names) => safeName(
  names
    .map(envName => process.env[envName])
    .reduce((result, current) => result || current, undefined)
)

export default class {
  get baseBranchName () {
    return readPrioritized('TRAVIS_BRANCH')
  }

  get currentBranch () {
    return this.isPullRequest ? this.pullRequestBranch : this.baseBranchName
  }

  get buildNumber () {
    return readPrioritized('TRAVIS_BUILD_NUMBER')
  }

  get pullRequestBranch () {
    return readPrioritized('TRAVIS_PULL_REQUEST_BRANCH')
  }

  get isPullRequest () {
    return !!this.pullRequestBranch
  }

  get isVariablesReady () {
    return !!(this.currentBranch && this.buildNumber)
  }
}