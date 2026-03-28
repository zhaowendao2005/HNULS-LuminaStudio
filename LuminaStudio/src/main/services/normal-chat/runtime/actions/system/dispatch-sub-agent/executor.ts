import type { NormalChatDispatchSubAgentOutput } from '../../shared/action.types'

export interface NormalChatDispatchSubAgentExecutionInput {
  goal: string
  enabledActionKeys: string[]
  pubmedMode: 'fast' | 'slow'
  maxReactSteps: number
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
