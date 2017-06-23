import bodyParser from 'body-parser'
import crypto from 'crypto'
import express from 'express'

import * as configuration from './configuration'

import { receivedPostback, receivedMessage, receivedReferal } from './bot'

if (!(configuration.APP_SECRET &&
      configuration.VALIDATION_TOKEN &&
      configuration.PAGE_ACCESS_TOKENS)) {
  console.error('Missing config values')
  process.exit(1)
}

/*
 * Verify that the callback came from Facebook. Using the App Secret from
 * the App Dashboard, we can verify the signature that is sent with each
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
const verifyRequestSignature = (req, res, buf) => {
  const signature = req.headers['x-hub-signature']

  if (!signature) {
    // For testing, let's log an error. In production, you should throw an
    // error.
    console.error('Could not validate the signature.')
  } else {
    const elements = signature.split('=')
    const signatureHash = elements[1]

    const expectedHash = crypto.createHmac('sha1', configuration.APP_SECRET)
                        .update(buf)
                        .digest('hex')

    if (signatureHash !== expectedHash) {
      throw new Error('Could not validate the request signature.')
    }
  }
}

const handleError = (err) => {
  console.error('ERROR')
  console.error(err)
}

const app = express()
app.set('view engine', 'ejs')
app.set('port', (process.env.PORT || 5000));
app.use(bodyParser.json({ verify: verifyRequestSignature }))
app.use(express.static('public'))

/*
 * Use your own validation token. Check that the token used in the Webhook
 * setup is the same token used here.
 *
 */
app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === configuration.VALIDATION_TOKEN) {
    console.log('Validating webhook')
    res.status(200).send(req.query['hub.challenge'])
  } else {
    console.error('Failed validation. Make sure the validation tokens match.')
    res.sendStatus(403)
  }
})

/*
 * All callbacks for Messenger are POST-ed.
 *
 */
app.post('/webhook', (req, res) => {
  const data = req.body
  console.log('request received!')

  // Make sure this is a page subscription
  if (data.object === 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach((pageEntry) => {
      const pageId = pageEntry.id
      console.log('pageId')
      console.log(pageId)

      // Iterate over each messaging event
      pageEntry.messaging.forEach((messagingEvent) => {
        if (messagingEvent.message) {
          receivedMessage(pageId, messagingEvent).catch(err => handleError(err))
        } else if (messagingEvent.postback) {
          receivedPostback(pageId, messagingEvent).catch(err => handleError(err))
        } else if (messagingEvent.referral) {
          receivedReferal(pageId, messagingEvent).catch(err => handleError(err))
        } else {
          console.log('Webhook received unknown messagingEvent: ', messagingEvent)
        }
      })
    })

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know you've
    // successfully received the callback. Otherwise, the request will time out.
    res.sendStatus(200)
  }
})

// Start server
// Webhooks must be available via SSL with a certificate signed by a valid
// certificate authority.
app.listen(app.get('port'), () => {
  console.log('Node app is running on port', app.get('port'))
})

module.exports = app
