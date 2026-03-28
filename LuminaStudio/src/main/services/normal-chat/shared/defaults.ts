import { randomUUID } from 'node:crypto'
import type {
  NormalChatAssistant,
  NormalChatFunctionCallMode,
  NormalChatTopic
} from '@preload/types'

export function createDefaultAssistant(sortOrder: number): NormalChatAssistant {
  return {
    id: randomUUID(),
    name: sortOrder === 0 ? '默认助手' : `临时助手 ${sortOrder + 1}`,
    emoji: '🤖',
    labelId: null,
    defaultSystemPrompt: '你是一个后端 stub 助手，负责承接 Normal Chat 的真实链路接入。',
    streamingEnabled: true,
    callMode: 'auto',
    costMode: 'per_token',
    defaultModelProviderId: 'provider-openai',
    defaultModelId: 'gpt-4o-mini',
    contextMemoryRounds: 12,
    maxRecursionDepth: 2,
    maxReasoningSteps: 6,
    systemActionFunctionCallEnabled: true,
    systemActionSubAgentEnabled: true,
    functionCallPubMedEnabled: true,
    functionCallPubMedMode: 'fast',
    mcpEnabled: false,
    sortOrder
  }
}

export function createDefaultTopic(assistantId: string, sortOrder: number): NormalChatTopic {
  return {
    id: randomUUID(),
    assistantId,
    title: sortOrder === 0 ? '默认话题' : `新话题 ${sortOrder + 1}`,
    systemPromptMode: 'inherit',
    systemPromptOverride: null,
    streamingMode: 'inherit',
    streamingEnabledOverride: null,
    costMode: 'inherit',
    costModeOverride: null,
    modelMode: 'inherit',
    modelProviderIdOverride: null,
    modelIdOverride: null,
    contextMemoryRoundsMode: 'inherit',
    contextMemoryRoundsOverride: null,
    maxRecursionDepthMode: 'inherit',
    maxRecursionDepthOverride: null,
    maxReasoningStepsMode: 'inherit',
    maxReasoningStepsOverride: null,
    systemActionFunctionCallMode: 'inherit',
    systemActionFunctionCallEnabledOverride: null,
    systemActionSubAgentMode: 'inherit',
    systemActionSubAgentEnabledOverride: null,
    functionCallPubMedMode: 'inherit',
    functionCallPubMedEnabledOverride: null,
    functionCallPubMedExecutionMode: 'inherit',
    functionCallPubMedExecutionModeOverride: null,
    mcpMode: 'inherit',
    mcpEnabledOverride: null,
    sortOrder
  }
}

export const DEFAULT_ACTION_POLICIES: Array<
  [
    actionKey: string,
    actionKind: 'system' | 'functioncall' | 'mcp',
    enabled: number,
    mode: NormalChatFunctionCallMode | 'slow'
  ]
> = [
  ['system.get_action_spec', 'system', 1, 'fast'],
  ['system.dispatch_sub_agent', 'system', 1, 'fast'],
  ['functioncall.pubmed', 'functioncall', 1, 'fast'],
  ['mcp.default', 'mcp', 0, 'slow']
]
