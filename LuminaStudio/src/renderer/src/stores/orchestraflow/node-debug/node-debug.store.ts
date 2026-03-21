import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { NodeDebugDataSource } from './node-debug.datasource'
import type { OFNodeDebugResult, OFNodeDebugRunParams } from '@shared/Orchestraflow-types'
import { useWorkflowEditorStore } from '../workflow-editor/workflow-editor.store'

export const useNodeDebugStore = defineStore('orchestraflow-node-debug', () => {
  const workflowEditorStore = useWorkflowEditorStore()
  const lastRunByNodeId = ref<Record<string, OFNodeDebugResult | undefined>>({})
  const formValuesByNodeId = ref<Record<string, Record<string, any>>>({})
  const runningNodeId = ref<string | null>(null)

  const isRunning = computed(() => runningNodeId.value !== null)

  function getNodeFormValues(nodeId: string): Record<string, any> {
    return formValuesByNodeId.value[nodeId] || {}
  }

  function setNodeFormValue(nodeId: string, key: string, value: any): void {
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
      if (workflowEditorStore.currentWorkflowId === params.workflowId) {
        // 中文注释：node debug 在 main 侧会重新从磁盘读取 workflow，
        // 如果这里不先强制保存，面板刚改过的 permission_tree / query_template 可能还停留在 1 秒防抖窗口内，
        // 最终调试执行到的是旧 JSON，而不是编辑器当前看到的节点配置。
        await workflowEditorStore.saveWorkflow()
      }

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
