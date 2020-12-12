import sjson from 'secure-json-parse'
import fs from 'fs'
import { promisify } from 'util'

class GithubActionsEnvironment {
  constructor (githubPayload) {
    switch (process.env.GITHUB_EVENT_NAME) {
      case 'pull_request':
        this.baseSha = githubPayload.pull_request?.base?.sha
        this.headSha = githubPayload.pull_request?.head?.sha
        break
      case 'push':
        this.baseSha = githubPayload.before
        this.headSha = githubPayload.after
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
