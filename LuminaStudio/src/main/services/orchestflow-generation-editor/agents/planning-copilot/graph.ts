import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { buildPlanningCopilotContext } from './context'
import { parsePlanningCopilotResult } from './parser'
import { buildPlanningCopilotPrompt } from './prompt'
import type { PlanningCopilotContext, PlanningCopilotResult } from './types'

export async function runPlanningCopilot(params: {
  model: { invoke(input: unknown, options?: unknown): Promise<{ content: unknown }> }
  context: PlanningCopilotContext
}): Promise<PlanningCopilotResult> {
  const contextText = buildPlanningCopilotContext(params.context)
  const prompt = buildPlanningCopilotPrompt(contextText)
  const response = await params.model.invoke([
    new SystemMessage('你负责给 analysis 文档产出 TOML patch。'),
    new HumanMessage(prompt)
  ])
  const patchToml = String(response.content || '').trim()
  parsePlanningCopilotResult(patchToml)
  return {
    patchToml,
    prompt,
    context: contextText
  }
}
