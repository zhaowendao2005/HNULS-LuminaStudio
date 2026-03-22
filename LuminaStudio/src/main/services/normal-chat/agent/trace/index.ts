import type { NormalChatAgentTraceEvent, NormalChatAgentTraceRecorder } from '../contracts'

export type { NormalChatAgentTraceEvent, NormalChatAgentTraceRecorder } from '../contracts'

export function createNormalChatTraceRecorder(): NormalChatAgentTraceRecorder {
  const events: NormalChatAgentTraceEvent[] = []

  return {
    // 这里先做内存记录，后续可以替换成更完整的结构化 trace 落地。
    record(event) {
      events.push(event)
    },
    snapshot() {
      return [...events]
    }
  }
}
