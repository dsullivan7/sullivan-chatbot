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
      next: () => states.ENQUIRY,
      messageType: 'text',
      message: profile => `Hey there ${profile.first_name} 👋 Thanks for the message!

We are here to help you with your health and fitness goals 💪
`,
      noReply: true,
    },
    [states.ENQUIRY]: {
      next: (user) => {
        if (user.responses[user.currentState] === `${states.ENQUIRY}_OPTION_1`) {
          return states.LEARNING
        } else if (user.responses[user.currentState] === `${states.ENQUIRY}_OPTION_2`) {
          return states.HELP
        }
        return states.OFF_SCRIPT
      },
      messageType: 'postback',
      message: () => 'Do you have an enquiry?',
      answers: () =>
        ({
          [`${states.ENQUIRY}_OPTION_1`]: 'Yes',
          [`${states.ENQUIRY}_OPTION_2`]: 'No',
        }),
    },
    [states.LEARNING]: {
      next: user => (offscript(user) ? states.OFF_SCRIPT : states.GOAL),
      messageType: 'postback',
      message: () => 'Okay great, what are you interested in learning more about?',
      answers: () =>
        ({
          [`${states.LEARNING}_OPTION_1`]: 'Nutrition Coaching',
          [`${states.LEARNING}_OPTION_2`]: 'In Person Coaching',
        }),
    },
    [states.GOAL]: {
      next: (user) => {
        if (user.responses[states.LEARNING] === `${states.LEARNING}_OPTION_1`) {
          return states.BARRIER_ONLINE
        } else if (user.responses[states.LEARNING] === `${states.LEARNING}_OPTION_2`) {
          return states.BARRIER_IN_PERSON
        }
        return states.OFF_SCRIPT
      },
      messageType: 'postback',
      message: () => 'Excellent choice! What would be your number one fitness goal right now?',
      answers: () =>
        ({
          [`${states.GOAL}_OPTION_1`]: 'Build firm, lean muscle',
          [`${states.GOAL}_OPTION_2`]: 'Burn Body Fat',
          [`${states.GOAL}_OPTION_3`]: 'Improve My Nutrition',
        }),
    },
    [states.BARRIER_ONLINE]: {
      next: user => (offscript(user) ? states.OFF_SCRIPT : states.IMPORTANCE),
      messageType: 'postback',
      message: () => 'What is holding you back from achieving that goal at the moment?',
      answers: () =>
        ({
          [`${states.BARRIER_ONLINE}_OPTION_1`]: 'Accountability',
          [`${states.BARRIER_ONLINE}_OPTION_2`]: 'Knowledge',
          [`${states.BARRIER_ONLINE}_OPTION_3`]: 'Structure',
        }),
    },
    [states.BARRIER_IN_PERSON]: {
      next: user => (offscript(user) ? states.OFF_SCRIPT : states.IMPORTANCE),
      messageType: 'postback',
      message: () => 'What is holding you back from achieving that goal at the moment?',
      answers: () =>
        ({
          [`${states.BARRIER_IN_PERSON}_OPTION_1`]: 'Training',
          [`${states.BARRIER_IN_PERSON}_OPTION_2`]: 'Nutrition',
          [`${states.BARRIER_IN_PERSON}_OPTION_3`]: 'Accountability',
        }),
    },
    [states.IMPORTANCE]: {
      next: (user) => {
        if (user.responses[states.IMPORTANCE] === `${states.IMPORTANCE}_OPTION_3`) {
          return states.DECLINE
        } else if (user.responses[states.IMPORTANCE].startsWith(states.IMPORTANCE)) {
          return states.START
        }
        return states.OFF_SCRIPT
      },
      messageType: 'postback',
      message: () => 'How important is achieving this goal to you?',
      answers: () =>
        ({
          [`${states.IMPORTANCE}_OPTION_1`]: 'Very important 💯',
          [`${states.IMPORTANCE}_OPTION_2`]: 'Kinda important 🤷♂️',
          [`${states.IMPORTANCE}_OPTION_3`]: 'Not very important 🤔',
        }),
    },
    [states.DECLINE]: {
      messageType: 'text',
      next: () => states.CALL_PROPOSAL,
      message: () => 'Ok thanks for that info, I don’t think it’s going to work out, if your goals aren’t important to you then they can’t be important to us.',
      noReply: true,
    },
    [states.CALL_PROPOSAL]: {
      next: (user) => {
        if (user.responses[states.CALL_PROPOSAL] === `${states.CALL_PROPOSAL}_OPTION_1`) {
          return states.CONTACT_INFO
        } else if (user.responses[states.CALL_PROPOSAL] === `${states.CALL_PROPOSAL}_OPTION_2`) {
          return states.GOODBYE
        }
        return states.OFF_SCRIPT
      },
      messageType: 'postback',
      message: () => 'To work out why you feel this way would you like one of the team to give you a call to discuss your goals in more detail?',
      answers: () =>
        ({
          [`${states.CALL_PROPOSAL}_OPTION_1`]: 'Yes',
          [`${states.CALL_PROPOSAL}_OPTION_2`]: 'No',
        }),
    },
    [states.START]: {
      next: user => (offscript(user) ? states.OFF_SCRIPT : states.CONTACT_INFO),
      messageType: 'postback',
      message: () => 'Ok great, I’m sure we can help, when would you want to get started?',
      answers: () =>
        ({
          [`${states.START}_OPTION_1`]: 'ASAP ✅',
          [`${states.START}_OPTION_2`]: 'Within the next 2 weeks',
          [`${states.START}_OPTION_3`]: 'Within the next month',
        }),
    },
    [states.CONTACT_INFO]: {
      messageType: 'text',
      next: () => states.THANKS,
      message: () => 'What was your best contact number so one of the team can give you a call?',
    },
    [states.OFF_SCRIPT]: {
      messageType: 'text',
      next: () => null,
      message: () => 'No problem, one of our consultants will be in touch shortly.',
      end: true,
    },
    [states.HELP]: {
      messageType: 'text',
      next: () => states.PROCESS_HELP,
      message: () => 'Ok, no worries, how can we help?',
    },
    [states.PROCESS_HELP]: {
      messageType: 'text',
      next: () => null,
      message: () => 'Ok, we\'ll pass that on to the right person for you.',
      end: true,
    },
    [states.THANKS]: {
      messageType: 'text',
      message: () => 'Thanks for that',
      next: () => states.CLOSING,
      noReply: true,
    },
    [states.CLOSING]: {
      messageType: 'text',
      message: () => 'Alrighty, thanks very much for getting in touch with us. Have a great day and we’ll be in touch shortly!',
      next: () => null,
      end: true,
    },
    [states.GOODBYE]: {
      messageType: 'text',
      message: () => 'Ok, have a great day.',
      next: () => null,
      end: true,
    },
  },
}

export { flow as default }
