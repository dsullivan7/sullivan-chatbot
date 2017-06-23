import { Flow } from 'chatbot-flow'

import * as utils from './utils'
import * as email from './email'
import User from './user'
import userStore from './userStore'
import { sendTextMessage, sendPostback, sendQuickReply } from './messages'
import { getUserInfo } from './facebookApiClient'
import config from './flow'
import * as configuration from './configuration'

const flow = new Flow(config)

/**
 * Processing the message ending
 * @param  {String} user - the user object
 */
const handleConversationEnd = (user) => {
  // we're in the closing state, send an email
  console.log('closing state!')

  let emailText = ''
  flow.getUser(user.userId).chatHistory.forEach((chatObject) => {
    emailText += `${chatObject.data.text}\n`
  })
  // const emailText = utils.getMessageBody(summary)
  const emailSubject = utils.getSubject(user)
  const emailTo = utils.getEmailTo(user)

  email.sendMail(emailText, emailSubject, emailTo)
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
export const receivedPostback = (pageId, event) => {
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
export const receivedMessage = (pageId, event) => {
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
export const receivedReferal = (pageId, event) => {
  const senderId = event.sender.id
  console.log('senderId')
  console.log(senderId)
  const referal = event.referral
  const messageData = {}

  messageData.ref = referal.ref

  return processUserMessage(pageId, senderId, messageData)
}
