import flow from './flow'

/**
 * returns whether this message initializes a conversation
 * @param  {string} userMessage - the message from the user
 * @return {boolean} - whether this is a conversation start
 */
const isConversationStart = userMessage => (userMessage === 'GET_STARTED' || userMessage === 'Get Started')

/**
 * returns whether we are at the end of the conversation
 * @param { Object } user - the user to check for the end of the conversation
 * @return {boolean} - whether this is a conversation end
 */
const isConversationEnd = user => flow.states[user.currentState].end

/**
 * returns the initial state for the flow
 * @return {string} - the initial state for the flow
 */
const getInitialState = () => flow.initialState

/**
 * returns the state that this answer matches with
 * @param { String } response - the response of the user
 */
const stateMatch = response => Object.keys(flow.states).find(state => response.startsWith(state))

/**
 * return the next state according to the response
 * @param { Object } user - the user object used to retrieve the next state
 */
const nextState = user => flow.states[user.currentState].next(user)

/**
 * process the response of the user according to the current state and updates the state
 * @param  {User} user - the user who gave the response
 * @param  {string} userMessage - the response of the user
 * @return {Promise} - a promise denoting success
 */
const processResponse = (user, userMessage) => {
  // ensure that the response matches the current state
  // if not, reset the state
  const match = stateMatch(userMessage)
  if (match) {
    user.setCurrentState(match)
  }

  // the response has no errors, save it
  user.saveResponse(user.currentState, userMessage)

  return Promise.resolve()
}

/**
 * return an array of message
 * @param  {User} user - the user to create an array of messages for
 * @param  {string} userMessage - the response of the user
 * @return {Array} - an array of message objects to send
 */
const nextMessages = (user, userMessage) => {
  // check to see if this response is a valid one
  if (flow.states[user.currentState].validation) {
    const invalidMessage = flow.states[user.currentState].validation(userMessage)
    if (invalidMessage) {
      // this is an invalid response, send it to the user
      return [invalidMessage]
    }
  }

  user.setCurrentState(nextState(user))

  const messages = []

  // create messages until we encounter a message that needs a reply
  while (true) {
    const message = flow.states[user.currentState].message(user)
    messages.push(message)

    if (flow.states[user.currentState].noReply) {
      user.setCurrentState(nextState(user))
    } else {
      break
    }
  }

  return messages
}

/**
 * return a summary object for the user
 * @param  {User} user - the user object
 * @return {Object} - a summary for the user
 */
const getSummary = (user) => {
  const summary = {}
  summary.userId = user.userId
  summary.profile = user.profile

  const responses = []
  Object.keys(user.responses).forEach((state) => {
    if (flow.states[state].message) {
      const message = flow.states[state].message(user)

      // if the flow has an answers function, and the response is defined for that answer,
      // store that as the answer
      // otherwise, just store whatever the user responded with
      const answer = (message.answers &&
        message.answers[user.responses[state]]) || user.responses[state]
      responses.push({ text: message.text, answer })
    }
  })

  summary.responses = responses

  return summary
}

module.exports = {
  isConversationStart,
  isConversationEnd,
  getInitialState,
  getSummary,
  processResponse,
  nextMessages,
  stateMatch,
}
