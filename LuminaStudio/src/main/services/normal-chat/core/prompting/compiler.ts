import type { NormalChatCallMode } from '@preload/types'
import type { NormalChatGraphHelperBinding } from '../../agent/contracts'
import type { NormalChatFunctioncallHelper } from '../../functioncalls/contracts'
import { buildJsonContractPrompt } from '../../json-output'
import type { NormalChatCoreBudget, NormalChatCoreObservation, NormalChatCorePhase } from '../types'

export interface NormalChatPlannerPromptInput {
  systemPrompt: string
  goal: string
  roleKind: string
  phase: NormalChatCorePhase
  callMode: Extract<NormalChatCallMode, 'fast' | 'slow'> | 'auto'
  budget: NormalChatCoreBudget
  latestSummary: string
  helperBindings: NormalChatGraphHelperBinding[]
  helpers: NormalChatFunctioncallHelper[]
  observations: NormalChatCoreObservation[]
}

function applyOverlay(
  baseText: string,
  overlayText: string | undefined,
  mode: 'append' | 'replace'
) {
  if (!overlayText?.trim()) {
    return baseText
  }

  return mode === 'replace' ? overlayText.trim() : `${baseText}\n${overlayText.trim()}`
}

function buildHelperCards(
  helperBindings: NormalChatGraphHelperBinding[],
  helpers: NormalChatFunctioncallHelper[]
): string {
  return helperBindings
    .map((binding) => {
      const helper = helpers.find((item) => item.id === binding.helperId)
      if (!helper) {
        return null
      }

      const overlayMode = binding.overlayMode ?? 'append'
      const description = applyOverlay(helper.description, binding.descriptionOverlay, overlayMode)
      const schemaPrompt = applyOverlay(helper.schemaPrompt, binding.schemaOverlay, overlayMode)

      return [
        `Helper: ${helper.id}`,
        `Display Name: ${helper.displayName}`,
        description,
        'Args Schema:',
        schemaPrompt
      ].join('\n')
    })
    .filter((item): item is string => Boolean(item))
    .join('\n\n')
}

function buildObservationDigest(observations: NormalChatCoreObservation[]): string {
  if (observations.length === 0) {
    return '暂无 observation，当前还没有拿到任何外部执行结果。'
  }

  return observations
    .map((observation) => {
      if (observation.kind === 'helper-observation') {
        return `helper ${observation.helperId}: ${observation.summary} | quality=${observation.assessment.quality} | shouldContinue=${observation.assessment.shouldContinue}`
      }
      if (observation.kind === 'child-observation') {
        return `child-task: ${observation.summary} | status=${observation.status}${observation.errorMessage ? ` | error=${observation.errorMessage}` : ''}`
      }
      if (observation.kind === 'final-answer-observation') {
        return `final-answer: ${observation.summary}`
      }
      return `fallback: ${observation.reason}`
    })
    .join('\n')
}

export function buildPlannerPrompt(input: NormalChatPlannerPromptInput): string {
  const helperCards = buildHelperCards(input.helperBindings, input.helpers)
  const observationDigest = buildObservationDigest(input.observations)

  return [
    input.systemPrompt || '你是 LuminaStudio normal-chat 的规划器。', // 保留用户配置 prompt 作为最顶层约束
    '',
    '你现在不是直接回答用户，而是生成“当前这一步”的执行协议。',
    '你必须只返回一个 JSON 对象，不要输出 Markdown，不要解释，不要补充其他文本。',
    `当前角色：${input.roleKind}`,
    `当前阶段：${input.phase}`,
    `当前模式：${input.callMode}`,
    `当前预算：step ${input.budget.stepIndex}/${input.budget.maxSteps}，depth ${input.budget.currentDepth}/${input.budget.maxDepth}，retry ${input.budget.currentRetries}/${input.budget.maxRetries}`,
    input.budget.isLastStep
      ? '这是最后一步，禁止继续调用 helper 或派发 child-task，必须直接给 final-answer 或 fallback。'
      : '如果已经有足够证据，优先直接收口，不要为了“看起来更聪明”继续递归。',
    '',
    `当前目标：${input.goal}`,
    `当前摘要：${input.latestSummary || '无'}`,
    '',
    '可用 helper：',
    helperCards || '当前没有可用 helper。',
    '',
    '已知 observation：',
    observationDigest,
    '',
    buildJsonContractPrompt({
      contractName: 'normal-chat step envelope',
      schemaPrompt: `{
  "phase": "strategy | evidence | synthesize | repair",
  "plannerNotes": "string",
  "statusText": "string | null",
  "actions": [
    {
      "kind": "helper-call | child-task | final-answer | fallback",
      "actionId": "string",
      "...": "see rules below"
    }
  ],
  "stopReason": "string | null"
}`.trim(),
      extraRules: [
        '如果 kind=helper-call，必须提供 helperId、reason、args、dependsOn。',
        '如果 kind=child-task，必须提供 roleKind、taskKind、goal、summary、expectedOutput、doneWhen、dependsOn。',
        '如果 kind=final-answer，必须提供 answerHint；answerHint 只写“基于现有 observation 的收口摘要要点”，不要把它写成最终回答原文。',
        '如果 kind=fallback，必须提供 reason。',
        '同一轮允许多个 action；多个独立 helper-call 或 child-task 应该放进同一个 actions 数组。',
        '不要返回空 actions。',
        '不要伪造 observation 结果，只能规划下一步。'
      ]
    })
  ].join('\n')
}
