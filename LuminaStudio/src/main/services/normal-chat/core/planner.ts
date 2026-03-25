import { AIMessage, HumanMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages'
import { z } from 'zod'
import type { NormalChatConversationPromptMessage } from '@preload/types'
import type {
  NormalChatAgentExecutionServices,
  NormalChatAgentSessionState,
  NormalChatGraphHelperBinding
} from '../agent/contracts'
import { parseJsonContractOutput } from '../json-output'
import { buildPlannerPrompt } from './prompting/compiler'
import type {
  NormalChatCoreBudget,
  NormalChatCoreObservation,
  NormalChatCorePlannerParseResult,
  NormalChatCoreStepEnvelope
} from './types'

const helperCallActionSchema = z.object({
  kind: z.literal('helper-call'),
  actionId: z.string().trim().min(1),
  helperId: z.string().trim().min(1),
  reason: z.string().trim().min(1),
  args: z.record(z.string(), z.unknown()),
  dependsOn: z.array(z.string().trim()).default([])
})

const childTaskActionSchema = z.object({
  kind: z.literal('child-task'),
  actionId: z.string().trim().min(1),
  roleKind: z.enum(['worker', 'repair']),
  taskKind: z.enum(['tool-research', 'repair', 'synthesis', 'direct-answer']),
  goal: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  expectedOutput: z.string().trim().min(1),
  doneWhen: z.string().trim().min(1),
  dependsOn: z.array(z.string().trim()).default([])
})

const finalAnswerActionSchema = z.object({
  kind: z.literal('final-answer'),
  actionId: z.string().trim().min(1),
  answerHint: z.string().trim().min(1)
})

const fallbackActionSchema = z.object({
  kind: z.literal('fallback'),
  actionId: z.string().trim().min(1),
  reason: z.string().trim().min(1)
})

const stepEnvelopeSchema = z.object({
  phase: z.enum(['strategy', 'evidence', 'synthesize', 'repair']),
  plannerNotes: z.string().trim().min(1),
  statusText: z.string().trim().nullable().optional(),
  actions: z
    .array(
      z.discriminatedUnion('kind', [
        helperCallActionSchema,
        childTaskActionSchema,
        finalAnswerActionSchema,
        fallbackActionSchema
      ])
    )
    .min(1),
  stopReason: z.string().trim().nullable().optional()
})

function extractMessageText(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }
        if (typeof item === 'object' && item && 'text' in item && typeof item.text === 'string') {
          return item.text
        }
        return ''
      })
      .join('')
  }

  return String(content ?? '')
}

function toBaseMessages(window: NormalChatConversationPromptMessage[]): BaseMessage[] {
  return window.map((message) => {
    if (message.role === 'assistant') {
      return new AIMessage(message.content)
    }
    if (message.role === 'system') {
      return new SystemMessage(message.content)
    }
    return new HumanMessage(message.content)
  })
}

export interface NormalChatPlannerPlanParams {
  session: NormalChatAgentSessionState
  services: NormalChatAgentExecutionServices
  helperBindings: NormalChatGraphHelperBinding[]
  budget: NormalChatCoreBudget
  currentPhase: NormalChatCoreStepEnvelope['phase']
  latestSummary: string
  observations: NormalChatCoreObservation[]
  conversationWindow: NormalChatConversationPromptMessage[]
}

/**
 * Planner 只负责把上下文编译成一个统一 step envelope。
 * 它不执行 helper、不派发 child，也不决定如何落库。
 */
export class NormalChatCorePlanner {
  async planStep(params: NormalChatPlannerPlanParams): Promise<NormalChatCorePlannerParseResult> {
    const resolvedCallMode = params.session.callMode === 'auto' ? 'slow' : params.session.callMode
    const helpers = params.helperBindings
      .map((binding) => params.services.functioncallRegistry.getHelper(binding.helperId))
      .filter((helper): helper is NonNullable<typeof helper> => helper !== null)

    const model = await params.services.createChatModel(
      params.session.providerId,
      params.session.modelId,
      params.session.signal
    )
    const response = await model.invoke(
      [
        new SystemMessage(
          buildPlannerPrompt({
            systemPrompt: params.session.systemPrompt,
            goal: params.session.goal,
            roleKind: params.session.roleKind,
            phase: params.currentPhase,
            callMode: resolvedCallMode,
            budget: params.budget,
            latestSummary: params.latestSummary,
            helperBindings: params.helperBindings,
            helpers,
            observations: params.observations
          })
        ),
        ...toBaseMessages(params.conversationWindow),
        new HumanMessage(`请为当前目标生成本轮 step envelope：${params.session.goal}`)
      ],
      {
        signal: params.session.signal
      }
    )

    const rawText = extractMessageText(response.content)
    const parsed = parseJsonContractOutput(rawText, stepEnvelopeSchema)
    const envelope = parsed.parsedJson
      ? {
          ...parsed.parsedJson,
          statusText: parsed.parsedJson.statusText ?? null,
          stopReason: parsed.parsedJson.stopReason ?? null
        }
      : null

    return {
      rawText,
      extractedJsonText: parsed.extractedText,
      repairedJsonText: parsed.repairedText,
      envelope,
      validationError: parsed.validationError,
      repairAttempted: parsed.repairAttempted
    }
  }
}
