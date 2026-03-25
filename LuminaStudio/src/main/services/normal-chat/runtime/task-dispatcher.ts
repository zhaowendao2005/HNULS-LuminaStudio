import { randomUUID } from 'crypto'
import type {
  ModelProviderProtocol,
  NormalChatCallMode,
  NormalChatConversationPromptMessage
} from '@preload/types'
import type { NormalChatAgentSessionState, NormalChatChildTaskPayload } from '../agent/contracts'

function buildChildConversationWindow(
  parent: NormalChatAgentSessionState,
  task: NormalChatChildTaskPayload
): NormalChatConversationPromptMessage[] {
  return [
    {
      role: 'system',
      content: `父级 agent 摘要：${parent.summary}`
    },
    {
      role: 'user',
      content: task.goal
    }
  ]
}

export function createChildAgentSession(
  parent: NormalChatAgentSessionState,
  task: NormalChatChildTaskPayload,
  providerProtocol: ModelProviderProtocol | null,
  overrideCallMode?: NormalChatCallMode
): NormalChatAgentSessionState {
  return {
    ...parent,
    providerProtocol,
    agentId: randomUUID(),
    parentAgentId: parent.agentId,
    depth: parent.depth + 1,
    roleKind: task.roleKind,
    taskKind: task.taskKind,
    goal: task.goal,
    summary: task.summary,
    callMode: overrideCallMode ?? parent.callMode,
    retryCount: 0,
    conversationWindow: buildChildConversationWindow(parent, task)
  }
}
