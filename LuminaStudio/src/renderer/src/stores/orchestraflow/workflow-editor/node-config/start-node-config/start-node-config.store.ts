/**
 * Start Node Config Store
 * 开始节点配置管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { OFStartNodeConfig, OFVariable } from '@shared/Orchestraflow-types'

export const useStartNodeConfigStore = defineStore('of-start-node-config', () => {
  const currentNodeId = ref<string | null>(null)
  const config = ref<OFStartNodeConfig>({
    nodeId: '',
    title: '开始',
    desc: '',
    input: { variables: [] }
  })

  function loadConfig(nodeId: string, data: Partial<OFStartNodeConfig>) {
    currentNodeId.value = nodeId
    config.value = {
      nodeId,
      title: data.title || '开始',
      desc: data.desc || '',
      input: data.input || { variables: [] }
    }
  }

  function setTitle(title: string) {
    config.value.title = title
  }
  function setDesc(desc: string) {
    config.value.desc = desc
  }
  function addInput(input: OFVariable) {
    config.value.input.variables.push(input)
  }
  function removeInput(index: number) {
    config.value.input.variables.splice(index, 1)
  }
  function updateInput(index: number, input: Partial<OFVariable>) {
    Object.assign(config.value.input.variables[index], input)
  }

  function exportConfig(): Partial<OFStartNodeConfig> {
    return { title: config.value.title, desc: config.value.desc, input: config.value.input }
  }

  function clear() {
    currentNodeId.value = null
    config.value = { nodeId: '', title: '开始', desc: '', input: { variables: [] } }
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
