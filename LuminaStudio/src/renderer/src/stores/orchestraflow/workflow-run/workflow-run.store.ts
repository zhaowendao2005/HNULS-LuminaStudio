/**
 * OrchestraFlow 工作流运行 Store
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { OFWorkflowRunResult, OFNodeTracing, OFInputVar } from '@shared/Orchestraflow-types'
import {
  getOFTraceIdentity,
  OFWorkflowRunningStatus,
  OFNodeRunningStatus,
  OFBlockEnum,
  OFVarType
} from '@shared/Orchestraflow-types'
import { WorkflowRunDataSource } from './workflow-run.datasource'
import { useWorkflowEditorStore } from '../workflow-editor/workflow-editor.store'

export function parseWorkflowInputValue(inputVar: OFInputVar, rawValue: unknown) {
  if (inputVar.type === OFVarType.Array || inputVar.type === OFVarType.Object) {
    if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') {
      return {
        ok: false as const,
        reason: 'empty'
      }
    }

    try {
      const parsed = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue

      if (inputVar.type === OFVarType.Array && !Array.isArray(parsed)) {
        return {
          ok: false as const,
          reason: 'not-array'
        }
      }

      if (
        inputVar.type === OFVarType.Object &&
        (Array.isArray(parsed) || parsed === null || typeof parsed !== 'object')
      ) {
        return {
          ok: false as const,
          reason: 'not-object'
        }
      }

      return {
        ok: true as const,
        value: parsed
      }
    } catch {
      return {
        ok: false as const,
        reason: 'invalid-json'
      }
    }
  }

  return {
    ok: true as const,
    value: rawValue
  }
}

export function normalizeWorkflowInputs(
  inputVars: OFInputVar[],
  rawInputs: Record<string, any>
): { values: Record<string, any>; errors: string[] } {
  const values: Record<string, any> = {}
  const errors: string[] = []

  for (const inputVar of inputVars) {
    const label = inputVar.label || inputVar.variable
    const rawValue = rawInputs[inputVar.variable]
    const parsed = parseWorkflowInputValue(inputVar, rawValue)

    if (!parsed.ok) {
      if (inputVar.required || rawValue !== undefined) {
        if (parsed.reason === 'empty') {
          errors.push(`"${label}" 为必填项`)
        } else if (parsed.reason === 'invalid-json') {
          errors.push(`"${label}" 必须是合法 JSON`)
        } else if (parsed.reason === 'not-array') {
          errors.push(`"${label}" 必须是 JSON 数组`)
        } else if (parsed.reason === 'not-object') {
          errors.push(`"${label}" 必须是 JSON 对象`)
        }
      }
      continue
    }

    values[inputVar.variable] = parsed.value
  }

  return { values, errors }
}

export const useWorkflowRunStore = defineStore('orchestraflow-workflow-run', () => {
  const editorStore = useWorkflowEditorStore()

  const status = ref<OFWorkflowRunningStatus>(OFWorkflowRunningStatus.NotStarted)
  const result = ref<OFWorkflowRunResult | null>(null)
  const running = ref(false)
  const currentWorkflowId = ref<string | null>(null)
  const currentRunId = ref<string | null>(null)
  const startInputs = ref<Record<string, any>>({})

  let progressUnsubscribe: (() => void) | null = null

  const hasResult = computed(() => result.value !== null)
  const isRunning = computed(() => running.value)
  const isSucceeded = computed(() => status.value === OFWorkflowRunningStatus.Succeeded)
  const isFailed = computed(() => status.value === OFWorkflowRunningStatus.Failed)
  const tracingList = computed(() => result.value?.tracing || [])

  async function runWorkflow(workflowId: string, inputs?: Record<string, any>) {
    running.value = true
    status.value = OFWorkflowRunningStatus.Running
    currentWorkflowId.value = workflowId
    currentRunId.value = null
    result.value = null
    editorStore.resetAllNodeRunningStatus(OFNodeRunningStatus.NotStarted)

    progressUnsubscribe = WorkflowRunDataSource.onProgress((runId, progress) => {
      if (!currentRunId.value) {
        currentRunId.value = runId
      }
      if (runId !== currentRunId.value) {
        return
      }
      currentRunId.value = runId
      handleProgress(progress)
      editorStore.updateNodeRunningStatus(progress.nodeId, progress.status)
    })

    try {
      const runResult = await WorkflowRunDataSource.run({
        workflowId,
        inputs
      })
      result.value = runResult
      status.value = runResult.status
    } catch (error) {
      console.error('Workflow run failed:', error)
      status.value = OFWorkflowRunningStatus.Failed
      result.value = {
        status: OFWorkflowRunningStatus.Failed,
        tracing: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    } finally {
      running.value = false
      if (progressUnsubscribe) {
        progressUnsubscribe()
        progressUnsubscribe = null
      }
    }
  }

  function handleProgress(progress: OFNodeTracing) {
    const tracing = result.value?.tracing || []
    const identity = getOFTraceIdentity(progress)
    const index = tracing.findIndex((item) => getOFTraceIdentity(item) === identity)

    if (index >= 0) {
      tracing[index] = progress
    } else {
      tracing.push(progress)
    }

    if (!result.value) {
      result.value = {
        status: OFWorkflowRunningStatus.Running,
        tracing
      }
    } else {
      result.value.tracing = tracing
    }
  }

  async function stopWorkflow() {
    if (!currentRunId.value) return

    try {
      await WorkflowRunDataSource.stop(currentRunId.value)
    } catch (error) {
      console.error('Failed to stop workflow:', error)
    } finally {
      running.value = false
      status.value = OFWorkflowRunningStatus.Stopped
      if (progressUnsubscribe) {
        progressUnsubscribe()
        progressUnsubscribe = null
      }
    }
  }

  function reset() {
    status.value = OFWorkflowRunningStatus.NotStarted
    result.value = null
    running.value = false
    currentWorkflowId.value = null
    currentRunId.value = null
    startInputs.value = {}
    if (progressUnsubscribe) {
      progressUnsubscribe()
      progressUnsubscribe = null
    }
  }

  function getNodeTracing(nodeId: string): OFNodeTracing | undefined {
    return result.value?.tracing.find((item) => item.nodeId === nodeId)
  }

  function setStartInputs(inputs: Record<string, any>) {
    startInputs.value = inputs
  }

  function updateStartInput(key: string, value: any) {
    startInputs.value[key] = value
  }

  function validateStartInputs(inputVars: OFInputVar[]): { valid: boolean; errors: string[] } {
    const { errors } = normalizeWorkflowInputs(inputVars, startInputs.value)

    return {
      valid: errors.length === 0,
      errors
    }
  }

  function getStartNodeInputs(nodes: { id: string; data: any }[]): OFInputVar[] {
    const startNode = nodes.find((node) => node.data.type === OFBlockEnum.Start)
    if (startNode && (startNode.data as any).input?.variables) {
      return (startNode.data as any).input.variables as OFInputVar[]
    }
    return []
  }

  return {
    status,
    result,
    running,
    currentWorkflowId,
    currentRunId,
    startInputs,
    hasResult,
    isRunning,
    isSucceeded,
    isFailed,
    tracingList,
    runWorkflow,
    stopWorkflow,
    reset,
    getNodeTracing,
    setStartInputs,
    updateStartInput,
    validateStartInputs,
    getStartNodeInputs
  }
})
