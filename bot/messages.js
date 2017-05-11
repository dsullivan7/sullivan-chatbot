import * as configuration from './configuration'
import { callSendAPI } from './facebookApiClient'

/*
 * Send a text message using the Send API.
 *
 */
export const sendTextMessage = (pageId, recipientId, messageText) => {
  const messageData = {
    recipient: {
      id: recipientId,
    },
    message: {
      text: messageText,
    },
  }

  const accessToken = configuration.PAGE_ACCESS_TOKENS[pageId]
  return callSendAPI(pageId, accessToken, messageData);
}

export const sendPostback = (pageId, recipientId, question, answers) => {
  const messageData = {
    recipient: {
      id: recipientId,
    },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'button',
          text: question,
          buttons:
            Object.keys(answers).map(answer =>
              ({
                type: 'postback',
                title: answers[answer],
                payload: answer,
              })),
        },
      },
    },
  }

  const accessToken = configuration.PAGE_ACCESS_TOKENS[pageId]
  return callSendAPI(pageId, accessToken, messageData)
}

/*
 * Send a message with Quick Reply buttons.
 *
 */
export const sendQuickReply = (pageId, recipientId, question, answers) => {
  const messageData = {
    recipient: {
      id: recipientId,
    },
    message: {
      text: question,
      quick_replies:
        Object.keys(answers).map(answer =>
          ({
            content_type: 'text',
            title: answers[answer],
            payload: answer,
          })),
    },
  }

  const accessToken = configuration.PAGE_ACCESS_TOKENS[pageId]
  return callSendAPI(pageId, accessToken, messageData)
}
