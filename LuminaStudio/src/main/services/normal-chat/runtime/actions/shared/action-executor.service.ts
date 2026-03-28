import type { NormalChatFunctionCallMessagePart } from '@preload/types'
import { NormalChatGetActionSpecExecutor } from '../system/get-action-spec/executor'
import {
  NormalChatDispatchSubAgentExecutor,
  type NormalChatDispatchSubAgentRunner
} from '../system/dispatch-sub-agent/executor'
import { NormalChatPubmedSearchExecutor } from '../functioncall/pubmed-search/executor'
import type {
  NormalChatActionCall,
  NormalChatActionExecutorOutput,
  NormalChatResolvedAction
} from './action.types'
import type { NormalChatActionResultRecord } from './action-result-projection'
import { getNormalChatActionDefinition } from './action-registry'

export interface NormalChatExecuteActionInput {
  call: NormalChatActionCall
  resolvedActions: NormalChatResolvedAction[]
  roundIndex: number
  batchIndex: number
  parallelIndex: number
  depth: number
}

export interface NormalChatExecutedAction {
  resultRecord: NormalChatActionResultRecord
  loadedActionKeys: string[]
  functionCallPart: NormalChatFunctionCallMessagePart
}

export class NormalChatActionExecutorService {
  private readonly getActionSpecExecutor = new NormalChatGetActionSpecExecutor()
  private dispatchSubAgentExecutor: NormalChatDispatchSubAgentExecutor | null = null

  constructor(private readonly pubmedSearchExecutor: NormalChatPubmedSearchExecutor) {}

  setSubAgentRunner(subAgentRunner: NormalChatDispatchSubAgentRunner): void {
    this.dispatchSubAgentExecutor = new NormalChatDispatchSubAgentExecutor(subAgentRunner)
  }

  async execute(input: NormalChatExecuteActionInput): Promise<NormalChatExecutedAction> {
    const resolvedAction = input.resolvedActions.find(
      (action) => action.actionKey === input.call.actionKey
    )
    const definition = getNormalChatActionDefinition(input.call.actionKey)
    if (!resolvedAction || !definition) {
      throw new Error(`Action is not enabled for this agent: ${input.call.actionKey}`)
    }

    const output = await this.runExecutor(input.call)
    const resultRecord: NormalChatActionResultRecord = {
      actionKey: input.call.actionKey,
      title: definition.descriptor.title,
      output
    }

    return {
      resultRecord,
      loadedActionKeys:
        input.call.actionKey === 'system.get_action_spec'
          ? [String((input.call.input.action_key ?? '') || '')]
          : [],
      functionCallPart: {
        kind: 'functioncall',
        callId: `${input.call.actionKey}-${input.roundIndex}-${input.parallelIndex}`,
        functionCallName: input.call.actionKey,
        title: definition.descriptor.title,
        status: 'success',
        input: JSON.stringify(input.call.input, null, 2),
        output: JSON.stringify(output, null, 2),
        errorMessage: null,
        isStreaming: false,
        roundIndex: input.roundIndex,
        batchIndex: input.batchIndex,
        parallelIndex: input.parallelIndex,
        depth: input.depth,
        decisionReason: definition.descriptor.description
      }
    }
  }

  private async runExecutor(call: NormalChatActionCall): Promise<NormalChatActionExecutorOutput> {
    if (call.actionKey === 'system.get_action_spec') {
      return this.getActionSpecExecutor.execute(String(call.input.action_key ?? ''))
    }

    if (call.actionKey === 'system.dispatch_sub_agent') {
      if (!this.dispatchSubAgentExecutor) {
        throw new Error('Subagent runner is not configured.')
      }
      return this.dispatchSubAgentExecutor.execute({
        goal: String(call.input.goal ?? ''),
        enabledActionKeys: Array.isArray(call.input.enabled_action_keys)
          ? call.input.enabled_action_keys.map((item) => String(item))
          : [],
        pubmedMode: call.input.pubmed_mode === 'slow' ? 'slow' : 'fast',
        maxReactSteps: Math.max(1, Number(call.input.max_react_steps ?? 2))
      })
    }

    if (call.actionKey === 'functioncall.pubmed_search') {
      return this.pubmedSearchExecutor.execute({
        query: String(call.input.query ?? ''),
        top_k: Math.max(1, Math.min(20, Number(call.input.top_k ?? 5))),
        sort: call.input.sort === 'pub_date' ? 'pub_date' : 'relevance',
        date_from: call.input.date_from ? String(call.input.date_from) : null,
        date_to: call.input.date_to ? String(call.input.date_to) : null,
        api_key_ref_id: call.input.api_key_ref_id ? String(call.input.api_key_ref_id) : null
      })
    }

    throw new Error(`Unsupported action key: ${call.actionKey}`)
  }
}
