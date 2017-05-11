import * as states from './states'

const offscript = user => !user.responses[user.currentState].startsWith(user.currentState)

// flow object represents the flow through a conversation
const flow = {
  initialState: states.GET_STARTED,
  states: {
    [states.GET_STARTED]: {
      next: () => states.GREETING,
    },
    [states.GREETING]: {
      next: () => states.QUICK_REPLY_DEMO,
      messageType: 'text',
      message: profile => `Hey there ${profile.first_name}! Thanks for the message!`,
      noReply: true,
    },
    [states.QUICK_REPLY_DEMO]: {
      next: user => (offscript(user) ? states.OFF_SCRIPT : states.POSTBACK_DEMO),
      messageType: 'quickReply',
      message: () => 'We can show buttons with different options, as you can see below.',
      answers: () =>
        ({
          [`${states.QUICK_REPLY_DEMO}_OPTION_1`]: 'Option 1',
          [`${states.QUICK_REPLY_DEMO}_OPTION_2`]: 'Option 2',
        }),
    },
    [states.POSTBACK_DEMO]: {
      next: user => (offscript(user) ? states.OFF_SCRIPT : states.QUESTION),
      messageType: 'postback',
      message: () => 'We can also show a different type of button.',
      answers: () =>
        ({
          [`${states.POSTBACK_DEMO}_OPTION_1`]: 'Option 1',
          [`${states.POSTBACK_DEMO}_OPTION_2`]: 'Option 2',
        }),
    },
    [states.OFF_SCRIPT]: {
      messageType: 'text',
      next: () => null,
      message: () => 'No problem, we\'ll have someone reach out to you shortly',
      end: true,
    },
    [states.QUESTION]: {
      messageType: 'text',
      next: () => states.CLOSING,
      message: () => 'Cool, now is there a specific question you\'re wondering about?',
    },
    [states.CLOSING]: {
      messageType: 'text',
      message: () => 'Alrighty, we\'ll forward your info the the right person. Thanks very much for getting in touch with us. Have a great day and we’ll be in touch shortly!',
      next: () => null,
      end: true,
    },
  },
}

export { flow as default }
