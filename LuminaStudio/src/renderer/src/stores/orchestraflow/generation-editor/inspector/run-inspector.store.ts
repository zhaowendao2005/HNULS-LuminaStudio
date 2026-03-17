import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { GenerationStreamEvent } from '@preload/types'
import type { RunInspectorRecord } from './run-inspector.types'

export const useGenerationRunInspectorStore = defineStore('generation-run-inspector', () => {
  const runs = ref<Record<string, RunInspectorRecord>>({})
  const selectedRunId = ref<string | null>(null)
  const messageIdToRunId = ref<Record<string, string>>({})
  const requestIdToRunId = ref<Record<string, string>>({})

  const selectedRun = computed(() => {
    if (!selectedRunId.value) return null
    return runs.value[selectedRunId.value] || null
  })

  function appendEvent(event: GenerationStreamEvent): void {
    const current =
      runs.value[event.runId] ||
      ({
        runId: event.runId,
        runStart: null,
        status: 'running',
        events: [],
        prompts: [],
        contexts: [],
        memories: [],
        validations: [],
        budgets: [],
        lastError: null
      } satisfies RunInspectorRecord)

    current.events.push(event)
    if (event.type === 'run-start') {
      current.runStart = event
      messageIdToRunId.value[event.messageId] = event.runId
      requestIdToRunId.value[event.requestId] = event.runId
    }
    if (event.type === 'prompt-snapshot') current.prompts.push(event)
    if (event.type === 'context-snapshot') current.contexts.push(event)
    if (event.type === 'memory-snapshot') current.memories.push(event)
    if (event.type === 'validation-report') current.validations.push(event)
    if (event.type === 'budget-update') current.budgets.push(event)
    if (event.type === 'run-error') {
      current.status = 'failed'
      current.lastError = event.error
    }
    if (event.type === 'run-finish') {
      current.status = event.status
    }
    runs.value[event.runId] = current
    selectedRunId.value = event.runId
  }

  function findRunByMessageId(messageId: string | null | undefined): RunInspectorRecord | null {
    if (!messageId) return null
    const runId = messageIdToRunId.value[messageId]
    return runId ? runs.value[runId] || null : null
  }

  function findRunByRequestId(requestId: string | null | undefined): RunInspectorRecord | null {
    if (!requestId) return null
    const runId = requestIdToRunId.value[requestId]
    return runId ? runs.value[runId] || null : null
  }

  return {
    runs,
    selectedRunId,
    messageIdToRunId,
    requestIdToRunId,
    selectedRun,
    appendEvent,
    findRunByMessageId,
    findRunByRequestId
  }
})
