import express from 'express'
import expressWs from 'express-ws'
import api from 'api'
import { nanoid } from 'nanoid'

const SUBSCRIPTION_PEER = process.env.STORAGE_URL || 'http://localhost:5001'

let documents = new api.Documents(
  {
    name: 'Server',
    id: nanoid(),
  },
  SUBSCRIPTION_PEER
)

app.ws('/:id/:did', async (req, res) => {
  let upwell = await documents.open(req.params.id)
  if (!upwell) {
    try {
      await documents.sync(id)
      upwell = documents.get(id)
      documents.connect(id)
      documents.connectDraft(id, req.params.did)
    } catch (err) {
      console.error(err)
      console.error('No document found')
      res.end()
    }
  }
})

app.ws('/:id/:did/destroy', async (req, res) => {
  documents.disconnect(req.params.id)
  documents.disconnect(req.params.did)
  console.error('Disconnected')
  res.end()
})
