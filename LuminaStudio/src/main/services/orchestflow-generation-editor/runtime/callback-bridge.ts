import type { GenerationEventSink } from './types/runtime.types'

export class GenerationCallbackBridge {
  constructor(
    private readonly sink: GenerationEventSink,
    private readonly runId: string
  ) {}

  emit(event: Record<string, unknown>): void {
    this.sink.emit({
      ...(event as Record<string, unknown>),
      runId: this.runId
    } as never)
  }
}
