/**
 * OrchestraFlow 工作流运行 Mock 数据
 */
import type { OFWorkflowRunResult } from '@preload/types'
import { OFWorkflowRunningStatus, OFNodeRunningStatus, OFBlockEnum } from '@preload/types'

/**
 * 模拟运行结果
 */
export function createMockRunResult(): OFWorkflowRunResult {
  return {
    status: OFWorkflowRunningStatus.Succeeded,
    elapsed_time: 2.34,
    total_tokens: 156,
    tracing: [
      {
        nodeId: 'start-1',
        nodeType: OFBlockEnum.Start,
        status: OFNodeRunningStatus.Succeeded,
        elapsed_time: 0.01
      },
      {
        nodeId: 'llm-1',
        nodeType: OFBlockEnum.LLM,
        status: OFNodeRunningStatus.Succeeded,
        elapsed_time: 2.3,
        outputs: {
          text: '这是模拟的 LLM 输出结果'
        }
      },
      {
        nodeId: 'end-1',
        nodeType: OFBlockEnum.End,
        status: OFNodeRunningStatus.Succeeded,
        elapsed_time: 0.03
      }
    ],
    outputs: {
      result: '这是模拟的工作流输出结果'
    }
  }
}
