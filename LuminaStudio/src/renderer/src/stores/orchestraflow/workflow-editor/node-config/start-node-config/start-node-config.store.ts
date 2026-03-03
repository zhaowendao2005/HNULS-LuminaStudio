/**
 * Start Node Config Store
 * 开始节点配置管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { OFStartNodeConfig, OFInputVar } from '@Public/ShareTypes/Orchestraflow-types'

export const useStartNodeConfigStore = defineStore('of-start-node-config', () => {
  const currentNodeId = ref<string | null>(null)
  const config = ref<OFStartNodeConfig>({
    nodeId: '',
    title: '开始',
    desc: '',
    inputs: []
  })

  function loadConfig(nodeId: string, data: Partial<OFStartNodeConfig>) {
    currentNodeId.value = nodeId
    config.value = {
      nodeId,
      title: data.title || '开始',
      desc: data.desc || '',
      inputs: data.inputs || []
    }
  }

  function setTitle(title: string) {
    config.value.title = title
  }
  function setDesc(desc: string) {
    config.value.desc = desc
  }
  function addInput(input: OFInputVar) {
    config.value.inputs.push(input)
  }
  function removeInput(index: number) {
    config.value.inputs.splice(index, 1)
  }
  function updateInput(index: number, input: Partial<OFInputVar>) {
    Object.assign(config.value.inputs[index], input)
  }

  function exportConfig(): Partial<OFStartNodeConfig> {
    return { title: config.value.title, desc: config.value.desc, inputs: config.value.inputs }
  }

  function clear() {
    currentNodeId.value = null
    config.value = { nodeId: '', title: '开始', desc: '', inputs: [] }
  }

  return {
    currentNodeId,
    config,
    loadConfig,
    setTitle,
    setDesc,
    addInput,
    removeInput,
    updateInput,
    exportConfig,
    clear
  }
})
