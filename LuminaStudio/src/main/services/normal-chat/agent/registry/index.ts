import type { NormalChatAgentTemplate } from '@preload/types'
import { BaseChatAgentGraph } from '../Agents/base-chat-agent'
import type { BaseChatAgentGraphOptions } from '../Agents/base-chat-agent/graph'
import type { NormalChatAgentTemplateDefinition } from '../contracts'

const NORMAL_CHAT_AGENT_TEMPLATES: NormalChatAgentTemplateDefinition[] = [
  {
    key: 'base-agent',
    title: '基础助手',
    description: '通用聊天助手模板，后续可以在这里继续扩展真实 agent 逻辑。',
    emoji: '🤖',
    defaultSystemPrompt: '你是一个通用中文助手，请直接、清晰地帮助用户完成当前任务。'
  }
]

export function listNormalChatAgentTemplates(): NormalChatAgentTemplate[] {
  return NORMAL_CHAT_AGENT_TEMPLATES.map(
    ({ defaultSystemPrompt: _defaultSystemPrompt, ...template }) => ({
      ...template
    })
  )
}

export function getNormalChatAgentTemplateDefinition(
  templateKey: string
): NormalChatAgentTemplateDefinition | null {
  return NORMAL_CHAT_AGENT_TEMPLATES.find((template) => template.key === templateKey) ?? null
}

export function createNormalChatAgentGraph(
  templateKey: string,
  options: BaseChatAgentGraphOptions
): BaseChatAgentGraph | null {
  if (templateKey === 'base-agent') {
    return new BaseChatAgentGraph(options)
  }

  return null
}
