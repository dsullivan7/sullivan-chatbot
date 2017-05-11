// App Secret can be retrieved from the App Dashboard
export const APP_SECRET = process.env.MESSENGER_APP_SECRET

// Arbitrary value used to validate a webhook
export const VALIDATION_TOKEN = process.env.MESSENGER_VALIDATION_TOKEN

// Generate a page access token for your page from the App Dashboard
// Page Access Tokens are stored in the config as PAGE_ACCESS_TOKEN_MyAppName_MyAppId
// We need to store each access token in the config under MyAppId
const PAGE_ACCESS_TOKEN = 'PAGE_ACCESS_TOKEN'
export const PAGE_ACCESS_TOKENS = {}
Object.keys(process.env).forEach((variableName) => {
  if (variableName.startsWith(PAGE_ACCESS_TOKEN)) {
    const variableArray = variableName.split('_')
    const pageId = variableArray[variableArray.length - 1]

    PAGE_ACCESS_TOKENS[pageId] = process.env[variableName]
  }
})

// URL where the app is running (include protocol). Used to point to scripts and
// assets located at this address.
export const SERVER_URL = process.env.SERVER_URL
