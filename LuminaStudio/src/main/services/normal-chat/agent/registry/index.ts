import type { NormalChatAgentTemplate } from '@preload/types'
import type {
  NormalChatAgentSuite,
  NormalChatAgentSuiteContext,
  NormalChatAgentTemplateDefinition
} from '../contracts'
import { BaseAgentGraph } from '../templates/base-agent'

const NORMAL_CHAT_AGENT_TEMPLATES: NormalChatAgentTemplateDefinition[] = [
  {
    key: 'base-agent',
    title: '基础助手',
    description: '递归式 director/worker/repair 基础模板，支持本地 JSON 规划与 helper 派发。',
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

export function createNormalChatAgentSuite(templateKey: string): NormalChatAgentSuite | null {
  if (templateKey !== 'base-agent') {
    return null
  }

  const template = getNormalChatAgentTemplateDefinition(templateKey)
  if (!template) {
    return null
  }

  return {
    template,
    createGraph(graphContext: NormalChatAgentSuiteContext) {
      return new BaseAgentGraph(graphContext.services)
    }
  }
}
