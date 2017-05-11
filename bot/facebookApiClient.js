import rp from 'request-promise'

const apiUrl = 'https://graph.facebook.com/v2.9'

/*
 * Call the Send API. The message data goes in the body. If successful, we'll
 * get the message id in a response
 *
 */
export const callSendAPI = (pageId, accessToken, messageData) =>
  rp({
    uri: `${apiUrl}/me/messages`,
    qs: { access_token: accessToken },
    method: 'POST',
    body: messageData,
    json: true,
  })

/*
 * Call the graph API for the user data
 *
 */
export const getUserInfo = (pageId, accessToken, userId) =>
  rp({
    uri: `${apiUrl}/${userId}`,
    qs: { access_token: accessToken },
    method: 'GET',
    json: true,
  })
