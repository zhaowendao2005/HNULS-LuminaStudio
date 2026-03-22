import type { NormalChatAgentRunContext, NormalChatAgentTraceRecorder } from '../../contracts'
import { buildBaseChatAgentPrompt } from './prompt'

export interface BaseChatAgentGraphRunResult {
  answerText: string
}

export interface BaseChatAgentGraphOptions {
  trace?: NormalChatAgentTraceRecorder
}

export class BaseChatAgentGraph {
  constructor(private readonly options: BaseChatAgentGraphOptions = {}) {}

  async run(context: NormalChatAgentRunContext): Promise<BaseChatAgentGraphRunResult> {
    const trace = this.options.trace
    const prompt = buildBaseChatAgentPrompt({
      systemPrompt: context.systemPrompt
    })

    // 这里先把 graph 的流程骨架显式写出来，后面再逐步往里面填 plan / decide / tool loop。
    trace?.record({
      type: 'run-start',
      requestId: context.requestId,
      topicId: context.topicId,
      assistantId: context.assistantId,
      modelId: context.modelId,
      message: 'BaseChatAgentGraph 开始执行'
    })

    let step: 'plan' | 'decide' | 'final' = 'plan'
    let answerText = ''

    while (!context.signal.aborted) {
      if (step === 'plan') {
        trace?.record({
          type: 'decision',
          requestId: context.requestId,
          topicId: context.topicId,
          step,
          message: '先整理上下文，再进入决策阶段'
        })
        step = 'decide'
        continue
      }

      if (step === 'decide') {
        trace?.record({
          type: 'decision',
          requestId: context.requestId,
          topicId: context.topicId,
          step,
          message: '当前版本先直接进入最终回答，后续再插入工具判断'
        })
        step = 'final'
        continue
      }

      if (step === 'final') {
        trace?.record({
          type: 'answer-start',
          requestId: context.requestId,
          topicId: context.topicId,
          message: '开始生成最终回答'
        })
        answerText = prompt
        trace?.record({
          type: 'answer-delta',
          requestId: context.requestId,
          topicId: context.topicId,
          delta: answerText
        })
        trace?.record({
          type: 'run-finish',
          requestId: context.requestId,
          topicId: context.topicId,
          output: answerText,
          message: 'BaseChatAgentGraph 执行结束'
        })
        return { answerText }
      }
    }

    throw new Error('BaseChatAgentGraph 已中止')
  }
}
