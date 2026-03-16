import type { GenerationTraceBufferEntry } from './types/trace.types'

export class GenerationTraceBuffer {
  private readonly buffer = new Map<string, GenerationTraceBufferEntry>()

  append(runId: string, event: unknown): void {
    const current = this.buffer.get(runId) || { runId, events: [] }
    current.events.push(event)
    this.buffer.set(runId, current)
  }

  clear(runId: string): void {
    this.buffer.delete(runId)
  }
}
