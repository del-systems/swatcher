import sjson from 'secure-json-parse'
import fs from 'fs'
import { promisify } from 'util'

class GithubActionsEnvironment {
  constructor (githubPayload) {
    switch (process.env.GITHUB_EVENT_NAME) {
      case 'pull_request':
        this.baseSha = githubPayload.base?.sha
        this.headSha = githubPayload.head?.sha
        break
      case 'push':
        this.baseSha = githubPayload.parents[0]?.sha
        this.headSha = githubPayload.sha
        break
    }

    if (!this.baseSha || !this.headSha) throw new Error('Base sha and head sha couldn\'t be resolved')
  }
}

/**
 * Fetches current CI and checks veriables
 * @returns {GithubActionsEnvironment}
 */
export default async function () {
  const eventPath = process.env.GITHUB_EVENT_PATH
  if (!eventPath) throw new Error('process.env.GITHUB_EVENT_PATH returned falsy value')

  const payload = sjson.parse(await promisify(fs.readFile)(eventPath, 'utf8'))
  return new GithubActionsEnvironment(payload)
}
