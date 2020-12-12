import nodeFetch from 'node-fetch'
import fs from 'fs'
import { promisify } from 'util'
import sjson from 'secure-json-parse'

const fetch = async (url, options) => {
  const response = await nodeFetch(url, options)
  if (!response.ok) throw new Error(`Response status was ${response.status} (${response.statusText}) for ${url}`)
  return await response.json()
}

export default async (comment) => {
  let credentials

  try {
    credentials = await checkIfCanComment()
  } catch (error) {
    console.warn(error.message)
    return
  }

  switch (credentials.eventName) {
    case 'pull_request':
      await createOrUpdatePullRequestComment(credentials, comment)
      break
    default:
      console.warn(`Skipping posting a message. Only 'pull_request' event is supported. Current event '${credentials.eventName}'`)
  }
}

const checkIfCanComment = async () => {
  const checkEnvVariableAndReturn = varName => {
    const value = process.env[varName]
    if (!value) throw new Error(`Required environment variable '${varName}' isn't set`)
    return value
  }

  return {
    repo: checkEnvVariableAndReturn('GITHUB_REPOSITORY'),
    token: checkEnvVariableAndReturn('SWATCHER_GITHUB_API_TOKEN'),
    apiURL: checkEnvVariableAndReturn('GITHUB_API_URL'),
    eventName: checkEnvVariableAndReturn('GITHUB_EVENT_NAME'),
    eventPayload: await sjson.parse(await promisify(fs.readFile)(checkEnvVariableAndReturn('GITHUB_EVENT_PATH'), 'utf8'))
  }
}

const createOrUpdatePullRequestComment = async (credentials, message) => {
  const headers = {
    Authorization: `token ${credentials.token}`,
    Accept: 'application/vnd.github.v3+json'
  }

  let url = `${credentials.apiURL}/repos/${credentials.repo}/issues/${credentials.eventPayload.number}/comments`
  let response = await fetch(url, { headers })
  let commentId = response.find(c => c.body.startsWith('<!--SWATCHER-->'))?.id
  if (!commentId) {
    const body = JSON.stringify({ body: '<!--SWATCHER-->' })
    response = await fetch(url, { headers, method: 'POST', body })
    commentId = response.id
  }

  url = `${credentials.apiURL}/repos/${credentials.repo}/issues/comments/${commentId}`
  await fetch(url, { method: 'PATCH', headers, body: '<!--SWATCHER-->\n' + message })
}
