import type { NormalChatActionCall } from '../../actions/shared/action.types'
import type { NormalChatAgentRoundEnvelope } from './output-envelope.types'

export class NormalChatOutputEnvelopeParser {
  parse(input: unknown): NormalChatAgentRoundEnvelope {
    const record = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
    const apiMetaMd = typeof record.apiMetaMd === 'string' ? record.apiMetaMd : ''
    const replyMd = typeof record.replyMd === 'string' ? record.replyMd : ''
    const wantsAction = record.wantsAction === true
    const actionCalls = Array.isArray(record.actionCalls)
      ? record.actionCalls
          .map((item) => this.parseActionCall(item))
          .filter((item): item is NormalChatActionCall => item !== null)
      : []

    if (!replyMd.trim()) {
      throw new Error('Agent envelope replyMd must not be empty.')
    }

    return {
      apiMetaMd,
      replyMd,
      wantsAction,
      actionCalls
    }
  }

  private parseActionCall(input: unknown): NormalChatActionCall | null {
    if (!input || typeof input !== 'object') {
      return null
    }

    const record = input as Record<string, unknown>
    if (typeof record.actionKey !== 'string' || !record.actionKey.trim()) {
      return null
    }

    return {
      actionKey: record.actionKey,
      input:
        record.input && typeof record.input === 'object'
          ? (record.input as Record<string, unknown>)
          : {}
    }
  }
}
