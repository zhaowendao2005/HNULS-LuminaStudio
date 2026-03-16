import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { buildAnalysisPlannerContext } from './context'
import { parseAnalysisPlannerResult } from './parser'
import { buildAnalysisPlannerPrompt } from './prompt'
import type { AnalysisPlannerContext, AnalysisPlannerResult } from './types'

export async function runAnalysisPlanner(params: {
  model: { invoke(input: unknown, options?: unknown): Promise<{ content: unknown }> }
  context: AnalysisPlannerContext
}): Promise<AnalysisPlannerResult> {
  const contextText = buildAnalysisPlannerContext(params.context)
  const prompt = buildAnalysisPlannerPrompt(contextText)
  const response = await params.model.invoke([
    new SystemMessage('你负责把需求整理成 analysis markdown。'),
    new HumanMessage(prompt)
  ])
  const markdown = parseAnalysisPlannerResult(String(response.content || ''))
  return {
    markdown,
    prompt,
    context: contextText
  }
}
