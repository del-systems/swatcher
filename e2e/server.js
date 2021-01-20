import express from 'express'
import bodyParser from 'body-parser'

const app = express()
app.use(bodyParser.json({ type: () => true }))

const checkAuth = (req, res) => {
  if (req.header('Authorization') !== 'token e2e_token') {
    res.status(401).send('Unauthorized')
    return false
  }

  return true
}
const comments = []
app.get('/repos/e2e/repo/issues/1/comments', (req, res) => {
  if (!checkAuth(req, res)) return
  res.send(comments)
})

app.get('/health-check', (req, res) => res.send('ok'))

app.post('/repos/e2e/repo/issues/1/comments', (req, res) => {
  if (!checkAuth(req, res)) return
  const id = Math.round(Math.random() * 100).toString()
  comments.push({
    id,
    body: req.body.body
  })

  res.send({ id })
})

app.patch('/repos/e2e/repo/issues/comments/:id', (req, res) => {
  if (!checkAuth(req, res)) return
  const comment = comments.find(item => item.id === req.params.id)
  if (!comment) {
    res.status(404).send('not found')
    return
  }

  comment.body = req.body
  res.send({})
})

app.listen(12345)
