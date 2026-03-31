import type { NormalChatActionCall } from '../../actions/shared/action.types'
import type { NormalChatAssistantStructuredOutput } from './assistant-output.types'
import { extractActionBlocks, stripActionBlocks } from './action-block-extractor'

export class NormalChatAssistantOutputParser {
  parse(input: unknown): NormalChatAssistantStructuredOutput {
    if (typeof input !== 'string') {
      throw new Error('Assistant output raw response must be a string.')
    }

    const blocks = extractActionBlocks(input)
    if (blocks.length === 0) {
      const bodyMd = input.trim() || '[模型返回内容为空]'
      return {
        body_md: bodyMd,
        action_calls: []
      }
    }

    const actionCalls = blocks.map((block, index) => this.parseActionBlock(block.rawJson, index))
    const bodyMd = stripActionBlocks(input)

    if (!bodyMd.trim()) {
      throw new Error('Assistant output body markdown must not be empty when action blocks exist.')
    }

    return {
      body_md: bodyMd,
      action_calls: actionCalls
    }
  }

  private parseActionBlock(rawJson: string, index: number): NormalChatActionCall {
    let record: Record<string, unknown>
    try {
      record = JSON.parse(rawJson) as Record<string, unknown>
    } catch (error) {
      throw new Error(
        `Malformed normal_chat_action block #${index + 1}: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    if (typeof record.actionKey !== 'string' || !record.actionKey.trim()) {
      throw new Error(`normal_chat_action block #${index + 1} missing non-empty actionKey.`)
    }
    if (!record.input || typeof record.input !== 'object' || Array.isArray(record.input)) {
      throw new Error(`normal_chat_action block #${index + 1} must include an object input.`)
    }

    return {
      actionKey: record.actionKey,
      input: record.input as Record<string, unknown>
    }
  }
}
