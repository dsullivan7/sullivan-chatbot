/* eslint-env node, mocha */
import assert from 'assert'

import User from '../user'
import bot from '../bot'
import * as flow from '../flow'

const flowStub = {
  states: {
    GREETING: {
      next: () => 'ONE',
    },
    ONE: {
      next: () => 'TWO',
      message: () => ({
        text: 'this is one',
      }),
      noReply: true,
    },
    TWO: {
      next: () => 'END',
      message: () => ({
        text: 'this is two',
      }),
    },
  },
}

flow.default = flowStub

const user = new User()
user.setCurrentState('GREETING')

describe('bot', () => {
  describe('#nextMessages()', () => {
    it('should return an array of messages', () => {
      const messages = bot.nextMessages(user, 'blah')
      assert.equal(messages[0].text, 'this is one')
      assert.equal(messages[1].text, 'this is two')
    })
  })
  describe('#stateMatch()', () => {
    it('should return TWO when testing TWO_OPTION_1', () => {
      assert.equal(bot.stateMatch('TWO_OPTION_1'), 'TWO')
    })
  })
})
