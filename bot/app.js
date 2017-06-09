import bodyParser from 'body-parser'
import crypto from 'crypto'
import express from 'express'
import {Flow} from 'chatbot-flow'

import * as configuration from './configuration'
import * as utils from './utils'
import * as email from './email'
import User from './user'
import userStore from './userStore'

import { getUserInfo } from './facebookApiClient'
import { sendTextMessage, sendPostback, sendQuickReply } from './messages'

import config from './flow'

// import db from './database'

const flow = new Flow(config)

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

/**
 * Processing the message ending
 * @param  {String} user - the user object
 */
const handleConversationEnd = (user) => {
  // we're in the closing state, send an email
  console.log('closing state!')
  console.log(flow.getUser(user.userId).chatHistory)
  // const summary = bot.getSummary(user)
  // const emailText = utils.getMessageBody(summary)
  const emailSubject = utils.getSubject(user)
  const emailTo = utils.getEmailTo(user)

  email.sendMail('Heyo', emailSubject, emailTo)
}

/**
 * sends a message using the send API
 * @param  {String} pageId - the id of the page
 * @param  {String} senderId - the id of the sender
 * @return {Object} - the promise object
 */
const sendBotMessage = (pageId, senderId, message) => {
  switch (message.type) {
    case 'text':
      console.log('text message being sent')
      return sendTextMessage(pageId, senderId, message.text)
    case 'postback':
      return sendPostback(pageId, senderId, message.text, message.answers)
    case 'quickReply':
      return sendQuickReply(pageId, senderId, message.text, message.answers)
    default:
      console.log('messageType not recognized')
  }

  // in a null state, do nothing
  return Promise.resolve()
}


const checkEnd = (user) => {
  const myUser = flow.getUser(user.userId)
  console.log('user')
  console.log(user)
  console.log('myUser')
  console.log(myUser)
  if (!flow.getUser(user.userId).currentState) {
    handleConversationEnd(user)
  }

  return Promise.resolve()
}

/**
 * creates a chain of messages to send to the user
 * @param  {Text} pageId - the id of the page that was messaged
 * @param  {User} user - the user object
 * @param  {Text} userResponse - what the user responded with
 */
const messageChain = (pageId, senderId, messages) => {
  let promiseChain = Promise.resolve()
  messages.forEach((message) => {
    promiseChain = promiseChain.then(() => sendBotMessage(pageId, senderId, message))
  })

  return promiseChain
}

/**
 * handles the response to the question
 * @param  {Text} pageId - the id of the page that was messaged
 * @param  {Text} senderId - the id of the user who responded
 * @param  {Ojbect} messageData - and object with user message information
 */
const processUserMessage = (pageId, senderId, messageData) => {
  if (userStore[senderId]) {
    console.log('current state')
    console.log(userStore[senderId].currentState)
  }
  const accessToken = configuration.PAGE_ACCESS_TOKENS[pageId]
  let userPromise

  if (!userStore[senderId]) {
    userPromise = getUserInfo(pageId, accessToken, senderId).then((userInfo) => {
      const user = new User()
      user.userId = senderId
      user.profile = userInfo

      userStore[senderId] = user

      return user
    })
  } else {
    userPromise = Promise.resolve(userStore[senderId])
  }

  return userPromise
    .then(user => flow.getMessages(user.userId, messageData))
    .then(messages => messageChain(pageId, senderId, messages))
    .then(() => userPromise)
    .then(user => checkEnd(user))
}

/**
 * called when message is a formatted postback
 *
 * @param {String} pageId - the id of the page that this request came from
 * @param {Object} event - the event object that was sent
 */
const receivedPostback = (pageId, event) => {
  const senderId = event.sender.id;
  console.log('senderId')
  console.log(senderId)
  const messageData = {}
  messageData.payload = event.postback.payload
  messageData.ref = event.postback.referral && event.postback.referral.ref

  return processUserMessage(pageId, senderId, messageData)
}

/*
 * This event is called when a message is sent the page.
 *
 */
const receivedMessage = (pageId, event) => {
  const senderId = event.sender.id
  console.log('senderId')
  console.log(senderId)
  const message = event.message
  const messageData = {}

  if (message.quick_reply) {
    // store the payload from the quick reply
    messageData.payload = message.quick_reply.payload
  } else {
    // store information from the text field
    messageData.text = message.text
  }

  return processUserMessage(pageId, senderId, messageData)
}

/**
 * receives a referal event from the facebook messenger
 * @param  {string} pageId - the pageId that this request came from
 * @param  {Object} event - the event object
 * @return {Promise} - a promise for the response
 */
const receivedReferal = (pageId, event) => {
  const senderId = event.sender.id
  console.log('senderId')
  console.log(senderId)
  const referal = event.referral
  const messageData = {}

  messageData.ref = referal.ref

  return processUserMessage(pageId, senderId, messageData)
}

const handleError = (err) => {
  console.error('ERROR')
  console.error(err)
}

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
