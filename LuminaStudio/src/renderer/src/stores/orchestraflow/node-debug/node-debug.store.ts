import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { NodeDebugDataSource } from './node-debug.datasource'
import type { OFNodeDebugResult, OFNodeDebugRunParams } from '@shared/Orchestraflow-types'

export const useNodeDebugStore = defineStore('orchestraflow-node-debug', () => {
  const lastRunByNodeId = ref<Record<string, OFNodeDebugResult | undefined>>({})
  const formValuesByNodeId = ref<Record<string, Record<string, string>>>({})
  const runningNodeId = ref<string | null>(null)

  const isRunning = computed(() => runningNodeId.value !== null)

  function getNodeFormValues(nodeId: string): Record<string, string> {
    return formValuesByNodeId.value[nodeId] || {}
  }

  function setNodeFormValue(nodeId: string, key: string, value: string): void {
    const current = formValuesByNodeId.value[nodeId] || {}
    formValuesByNodeId.value[nodeId] = {
      ...current,
      [key]: value
    }
  }

  function getLastRun(nodeId: string): OFNodeDebugResult | undefined {
    return lastRunByNodeId.value[nodeId]
  }

  async function runNodeDebug(params: OFNodeDebugRunParams): Promise<OFNodeDebugResult> {
    runningNodeId.value = params.nodeId
    try {
      const result = await NodeDebugDataSource.run(params)
      lastRunByNodeId.value[params.nodeId] = result
      return result
    } finally {
      runningNodeId.value = null
    }
  }

  function clearNode(nodeId: string): void {
    delete lastRunByNodeId.value[nodeId]
    delete formValuesByNodeId.value[nodeId]
  }

  return {
    isRunning,
    runningNodeId,
    getNodeFormValues,
    setNodeFormValue,
    getLastRun,
    runNodeDebug,
    clearNode
  }
})
