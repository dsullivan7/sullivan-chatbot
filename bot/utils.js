/**
 * get a summary of a user to send in an email
 */
export const getMessageBody = (summary) => {
  let email = `\nHere is a summary for user: ${summary.userId}\n\n`

  Object.keys(summary.profile).forEach((profileField) => {
    email += `${profileField}: ${summary.profile[profileField]}\n`
  })

  summary.responses.forEach((response) => {
    email += `\n${response.text}\n${response.answer}\n`
  })

  return email
}

/**
 * get text to send in an message subject
 */
export const getSubject = user => `Sullivan Chatbot Summary For: ${user.userId}`

/**
 * get text to send in an message subject
 */
export const getEmailTo = () => 'dbsullivan23@gmail.com'
