import { randomUUID } from 'node:crypto'
import type { NormalChatTopic } from '@preload/types'
import { nowIso, parseJson } from '../shared/utils'
import {
  NormalChatConversationsRepository,
  type NormalChatConversationRecord
} from '../repositories/conversations.repository'

export interface NormalChatResolvedConversation {
  id: string
  topicId: string
  title: string
  agentTemplateId: string
  programPromptInjections: string[]
}

export class NormalChatConversationConfigService {
  constructor(private readonly conversationsRepository: NormalChatConversationsRepository) {}

  resolveOrCreateDefaultConversation(topic: NormalChatTopic): NormalChatResolvedConversation {
    const existing = this.conversationsRepository.getFirstByTopic(topic.id)
    if (existing) {
      return this.mapConversation(existing)
    }

    const created = this.conversationsRepository.create({
      id: randomUUID(),
      topicId: topic.id,
      title: `Conversation · ${topic.title}`,
      agentTemplateId: 'main-agent-v1',
      programPromptInjectionsJson: JSON.stringify([]),
      timestamp: nowIso()
    })

    return this.mapConversation(created)
  }

  private mapConversation(record: NormalChatConversationRecord): NormalChatResolvedConversation {
    return {
      id: record.id,
      topicId: record.topicId,
      title: record.title,
      agentTemplateId: record.agentTemplateId,
      programPromptInjections: parseJson(record.programPromptInjectionsJson, [] as string[])
    }
  }
}
