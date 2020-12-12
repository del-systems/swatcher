export const fakeEnv = (variables) => {
  const previous = process.env
  process.env = variables

  return () => { process.env = previous }
}

export const fakedGithubPayload = async payload => {
  const fs = jest.requireActual('fs')
  const promisify = jest.requireActual('util').promisify
  const temporaryFile = jest.requireActual('../temporary_file').default
  const { path, cleanup } = await temporaryFile()
  await promisify(fs.writeFile)(path, JSON.stringify(payload))

  const savedOriginalEnvVariable = process.env.GITHUB_EVENT_PATH
  process.env.GITHUB_EVENT_PATH = path
  return () => {
    process.env.GITHUB_EVENT_PATH = savedOriginalEnvVariable
    cleanup()
  }
}
