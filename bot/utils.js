import flow from './flow'

/**
 * get a summary of a user to send in an email
 */
export const getSummary = (user) => {
  let email = `\nHere is a summary for user: ${user.userId}\n\n`

  Object.keys(user.profile).forEach((profileField) => {
    email += `${profileField}: ${user.profile[profileField]}\n`
  })

  Object.keys(user.responses).forEach((state) => {
    if (flow.states[state].message) {
      const question = flow.states[state].message(user.profile)

      // if the flow has an answers function, and the response is defined for that answer,
      // store that as the answer
      // otherwise, just store whatever the user responded with
      const answer = (flow.states[state].answers &&
        flow.states[state].answers()[user.responses[state]]) || user.responses[state]

      email += `\n${question}\n${answer}\n`
    }
  })

  return email
}

/**
 * get text to send in an message subject
 */
export const getSubject = user => `Nutrition Chatbot Summary For: ${user.userId}`

/**
 * get text to send in an message subject
 */
export const getEmailTo = () => 'dbsullivan23@gmail.com, joshuadylancurry@gmail.com, james@thebodyconsultants.com'
