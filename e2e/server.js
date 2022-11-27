import express from 'express'
import bodyParser from 'body-parser'

const app = express()
app.use(bodyParser.json({ type: () => true }))

// used to detect if app running
app.get('/health-check', (req, res) => res.send('ok'))

// check if auth token is properly specified
app.use((req, res, next) => {
  if (req.header('Authorization') !== 'token e2e_token') {
    return res.status(401).send('Unauthorized')
  } else {
    next()
  }
})

const comments = []
app.get('/repos/e2e/repo/issues/1/comments', (req, res) => {
  res.send(comments)
})

app.post('/repos/e2e/repo/issues/1/comments', (req, res) => {
  const id = Math.round(Math.random() * 100).toString()
  comments.push({
    id,
    body: req.body.body
  })

  res.send({ id })
})

app.patch('/repos/e2e/repo/issues/comments/:id', (req, res) => {
  const comment = comments.find(item => item.id === req.params.id)
  if (!comment) {
    res.status(404).send('not found')
    return
  }

  comment.body = req.body
  res.send({})
})

setTimeout(() => app.listen(12345), 15000)
