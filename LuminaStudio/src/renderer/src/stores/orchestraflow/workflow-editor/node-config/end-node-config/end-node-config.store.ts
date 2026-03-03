/**
 * End Node Config Store
 * 结束节点配置管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { OFEndNodeConfig } from '@Public/ShareTypes/Orchestraflow-types'

export const useEndNodeConfigStore = defineStore('of-end-node-config', () => {
  const currentNodeId = ref<string | null>(null)
  const config = ref<OFEndNodeConfig>({
    nodeId: '',
    title: '结束',
    desc: '',
    outputs: []
  })

  function loadConfig(nodeId: string, data: Partial<OFEndNodeConfig>) {
    currentNodeId.value = nodeId
    config.value = {
      nodeId,
      title: data.title || '结束',
      desc: data.desc || '',
      outputs: data.outputs || []
    }
  }

  function setTitle(title: string) {
    config.value.title = title
  }
  function setDesc(desc: string) {
    config.value.desc = desc
  }
  function addOutput(output: { variable: string; value_selector: string[] }) {
    config.value.outputs.push(output)
  }
  function removeOutput(index: number) {
    config.value.outputs.splice(index, 1)
  }

  function exportConfig(): Partial<OFEndNodeConfig> {
    return { title: config.value.title, desc: config.value.desc, outputs: config.value.outputs }
  }

  function clear() {
    currentNodeId.value = null
    config.value = { nodeId: '', title: '结束', desc: '', outputs: [] }
  }

  return {
    currentNodeId,
    config,
    loadConfig,
    setTitle,
    setDesc,
    addOutput,
    removeOutput,
    exportConfig,
    clear
  }
})
