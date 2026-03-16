import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { buildDesignPlannerContext } from './context'
import { parseDesignPlannerResult } from './parser'
import { buildDesignPlannerPrompt } from './prompt'
import type { DesignPlannerContext, DesignPlannerResult } from './types'

export async function runDesignPlanner(params: {
  model: { invoke(input: unknown, options?: unknown): Promise<{ content: unknown }> }
  context: DesignPlannerContext
}): Promise<DesignPlannerResult> {
  const contextText = buildDesignPlannerContext(params.context)
  const prompt = buildDesignPlannerPrompt(contextText)
  const response = await params.model.invoke([
    new SystemMessage('你负责输出可编译的 OrchestraFlow TOML。'),
    new HumanMessage(prompt)
  ])
  return {
    toml: parseDesignPlannerResult(String(response.content || '')),
    prompt,
    context: contextText
  }
}
