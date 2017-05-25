import bodyParser from 'body-parser'
import crypto from 'crypto'
import express from 'express'

import flow from './flow'
import * as utils from './utils'
import * as email from './email'

import * as configuration from './configuration'

import { getUserInfo } from './facebookApiClient'
import { sendTextMessage, sendPostback, sendQuickReply } from './messages'

// import db from './database'

// users stores all user information, should be stored in a database
const users = {}

class User {
  constructor() {
    this.userId = null
    this.profile = null
    this.currentState = null
    this.responses = {}
  }

  saveResponse(state, response) {
    this.responses[state] = response
  }

  setCurrentState(state) {
    this.currentState = state
  }
}

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
 * return the next state according to the response
 * @param { Object } user - the user object used to retrieve the next state
 */
const nextState = user => flow.states[user.currentState].next(user)

/**
 * returns the state that this answer matches with
 * @param { String } response - the response of the user
 */
const stateMatch = response => Object.keys(flow.states).find(state => response.startsWith(state))

/**
 * Processing the message ending
 * @param  {String} pageId - the id of the page
 * @param  {String} senderId - the id of the sender
 */
const conversationEnd = (pageId, user) => {
  // we're in the closing state, send an email
  console.log('closing state!')
  const emailText = utils.getSummary(user)
  const emailSubject = utils.getSubject(user)
  const emailTo = utils.getEmailTo(user)

  email.sendMail(emailText, emailSubject, emailTo)

  // unset the state
  user.setCurrentState(null)
}

/**
 * sends a message using the send API
 * @param  {String} pageId - the id of the page
 * @param  {String} senderId - the id of the sender
 * @return {Object} - the promise object
 */
const sendBotMessage = (pageId, senderId, profile, state) => {
  let message
  let answers
  console.log('currentState')
  console.log(state)
  switch (flow.states[state].messageType) {
    case 'text':
      console.log('text message being sent')
      message = flow.states[state].message(profile)
      return sendTextMessage(pageId, senderId, message)
    case 'postback':
      message = flow.states[state].message(profile)
      answers = flow.states[state].answers()
      return sendPostback(pageId, senderId, message, answers)
    case 'quickReply':
      message = flow.states[state].message(profile)
      answers = flow.states[state].answers()
      return sendQuickReply(pageId, senderId, message, answers)
    default:
      console.log('messageType not recognized')
  }

  // in a null state, do nothing
  return Promise.resolve()
}


const checkEnd = (pageId, user) => {
  if (flow.states[user.currentState].end) {
    conversationEnd(pageId, user)
  }

  return Promise.resolve()
}

/**
 * creates a chain of messages to send to the user
 * @param  {Text} pageId - the id of the page that was messaged
 * @param  {User} user - the user object
 * @param  {Text} userResponse - what the user responded with
 */
const messageChain = (pageId, user, userResponse) => {
  const state = user.currentState
  const senderId = user.userId
  const profile = user.profile

  return sendBotMessage(pageId, senderId, profile, state).then(
    () => {
      if (flow.states[state].noReply) {
        // there is no need to wait for a response
        // proceed to the next state
        user.setCurrentState(nextState(user))
        return messageChain(pageId, user, userResponse)
      }

      // wait for reply
      return Promise.resolve()
    })
}

const processResponse = (pageId, user, userResponse) => {
  // check to see if this response is a valid one
  if (flow.states[user.currentState].validation) {
    const invalidMessage = flow.states[user.currentState].validation(userResponse)
    if (invalidMessage) {
      // this is an invalid response, send it to the user
      return sendTextMessage(pageId, user.userId, invalidMessage)
    }
  }

  // ensure that the response matches the current state
  // if not, reset the state
  const match = stateMatch(userResponse)
  if (match) {
    user.setCurrentState(match)
  }

  // the response has no errors, save it
  user.saveResponse(user.currentState, userResponse)
  user.setCurrentState(nextState(user))

  // no validation function to use
  return Promise.resolve()
}

/**
 * handles the response to the question
 * @param  {Text} pageId - the id of the page that was messaged
 * @param  {Text} senderId - the id of the user who responded
 * @param  {Text} userResponse - what the user responded with
 */
const processUserMessage = (pageId, senderId, userMessage) => {
  if (users[senderId]) {
    console.log('current state')
    console.log(users[senderId].currentState)
  }
  const accessToken = configuration.PAGE_ACCESS_TOKENS[pageId]
  let userPromise

  // check to see if we have a Get Started message for this user
  if (userMessage === 'GET_STARTED' ||
      userMessage === 'Get Started') {
    userPromise = getUserInfo(pageId, accessToken, senderId)
      .then((userInfo) => {
        const user = new User()
        user.userId = senderId
        user.profile = userInfo
        user.currentState = flow.initialState
        user.responses = {}

        users[senderId] = user

        return user
      })
  } else if (users[senderId] && users[senderId].currentState) {
    // this is an ongoing conversation, we do not need to initialize anything
    userPromise = Promise.resolve(users[senderId])
  }

  if (userPromise) {
    const savePromise = userPromise.then(user => processResponse(pageId, user, userMessage))
    const conversationPromise = Promise.all([userPromise, savePromise])
      .then(values => messageChain(pageId, values[0], userMessage))
    const endPromise = Promise.all([userPromise, conversationPromise])
      .then(values => checkEnd(pageId, values[0]))
    return endPromise
  }

  // this is not a message for the bot
  return Promise.resolve()
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

  const messageText = event.postback.payload

  return processUserMessage(pageId, senderId, messageText)
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
  let messageText

  if (message.quick_reply) {
    // store the payload from the quick reply
    messageText = message.quick_reply.payload
  } else {
    // store information from the text field
    messageText = message.text
  }

  return processUserMessage(pageId, senderId, messageText)
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
