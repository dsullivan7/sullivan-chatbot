export default class User {
  constructor() {
    this.userId = null
    this.profile = null
    this.currentState = null
    this.responses = {}
  }

  saveResponse(state, response) {
    this.responses[state] = response
  }

  setCurrentState(state) {
    this.currentState = state
  }
}
