import nodemailer from 'nodemailer'

const fromEmail = process.env.EMAIL
const fromEmailPassword = process.env.EMAIL_PASSWORD

// create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: `${fromEmail}`,
    pass: `${fromEmailPassword}`,
  },
})

// send mail with defined transport object
export const sendMail = (emailText, emailSubject, toEmail) => {
  // setup email data with unicode symbols
  const mailOptions = {
    from: `"Chatbot Email Service" <${fromEmail}>`,
    to: `${toEmail}`,
    subject: emailSubject,
    text: emailText,
  }
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error)
    }
    console.log('Message %s sent: %s', info.messageId, info.response)
    return 'success'
  })
}
