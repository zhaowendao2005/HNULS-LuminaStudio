import type { NormalChatAgentTraceRecorder } from '../contracts'

export type NormalChatAgentTraceEvent = unknown
export type { NormalChatAgentTraceRecorder } from '../contracts'

export function createNormalChatTraceRecorder(): NormalChatAgentTraceRecorder {
  const events: unknown[] = []
  const listeners = new Set<(event: unknown) => void>()

  return {
    record(event) {
      events.push(event)
      listeners.forEach((listener) => listener(event))
    },
    snapshot() {
      return [...events]
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }
  }
}
