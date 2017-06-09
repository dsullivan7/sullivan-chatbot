import * as states from './states'
import userStore from './userStore'

const offscript = user => (user.responses[user.currentState].payload &&
                           !user.responses[user.currentState].payload.startsWith(user.currentState))

// flow object represents the flow through a conversation
const flow = {
  initialState: states.GET_STARTED,
  states: {
    [states.GET_STARTED]: {
      next: () => states.GREETING,
    },
    [states.GREETING]: {
      next: () => states.QUICK_REPLY_DEMO,
      message: user => ({
        type: 'text',
        text: `Hey there ${userStore[user.sessionId].profile.first_name}! Thanks for the message!`,
      }),
      noReply: true,
    },
    [states.QUICK_REPLY_DEMO]: {
      next: user => (offscript(user) ? states.OFF_SCRIPT : states.POSTBACK_DEMO),
      message: () => ({
        type: 'quickReply',
        text: 'We can show buttons with different options, as you can see below.',
        answers: {
          [`${states.QUICK_REPLY_DEMO}_OPTION_1`]: 'Option 1',
          [`${states.QUICK_REPLY_DEMO}_OPTION_2`]: 'Option 2',
        },
      }),
    },
    [states.POSTBACK_DEMO]: {
      next: user => (offscript(user) ? states.OFF_SCRIPT : states.QUESTION),
      messageType: 'postback',
      message: () => ({
        type: 'postback',
        text: 'We can also show a different type of button.',
        answers:
          ({
            [`${states.POSTBACK_DEMO}_OPTION_1`]: 'Option 1',
            [`${states.POSTBACK_DEMO}_OPTION_2`]: 'Option 2',
          }),
      }),
    },
    [states.OFF_SCRIPT]: {
      next: () => null,
      message: () => ({
        type: 'text',
        text: 'No problem, we\'ll have someone reach out to you shortly',
      }),
    },
    [states.QUESTION]: {
      next: () => states.CLOSING,
      message: () => ({
        type: 'text',
        text: 'Cool, now is there a specific question you\'re wondering about?',
      }),
    },
    [states.CLOSING]: {
      message: () => ({
        type: 'text',
        text: 'Alrighty, we\'ll forward your info to the right person. Thanks very much for getting in touch with us. Have a great day and we’ll be in touch shortly!',
      }),
      noReply: true,
      next: () => null,
    },
  },
}

export { flow as default }
