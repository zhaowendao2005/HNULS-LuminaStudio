import type { NormalChatDispatchSubAgentOutput } from '../../shared/action.types'

export interface NormalChatDispatchSubAgentExecutionInput {
  goal: string
  enabledActionKeys: string[]
  parentActionRunId: string
  pubmedMode: 'fast' | 'slow'
  maxReactSteps: number
  /** transcript part ID，用于关联子代理状态更新 */
  transcriptPartId: string
}

export interface NormalChatDispatchSubAgentRunner {
  runSubAgent(
    input: NormalChatDispatchSubAgentExecutionInput
  ): Promise<NormalChatDispatchSubAgentOutput>
}

export class NormalChatDispatchSubAgentExecutor {
  constructor(private readonly runner: NormalChatDispatchSubAgentRunner) {}

  async execute(
    input: NormalChatDispatchSubAgentExecutionInput
  ): Promise<NormalChatDispatchSubAgentOutput> {
    return this.runner.runSubAgent(input)
  }
}
