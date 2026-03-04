/**
 * LLM Node Config Store
 * LLM节点配置管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  OFLLMNodeConfig,
  OFModelConfig,
  OFPromptItem
} from '@shared/Orchestraflow-types'

export const useLLMNodeConfigStore = defineStore('of-llm-node-config', () => {
  const currentNodeId = ref<string | null>(null)
  const config = ref<OFLLMNodeConfig>({
    nodeId: '',
    title: 'LLM',
    desc: '',
    model: { provider: '', name: '' },
    prompt_template: [],
    outputs: []
  })

  function loadConfig(nodeId: string, data: Partial<OFLLMNodeConfig>) {
    currentNodeId.value = nodeId
    config.value = {
      nodeId,
      title: data.title || 'LLM',
      desc: data.desc || '',
      model: data.model || { provider: '', name: '' },
      prompt_template: data.prompt_template || [],
      outputs: data.outputs || []
    }
  }

  function setTitle(title: string) {
    config.value.title = title
  }
  function setDesc(desc: string) {
    config.value.desc = desc
  }
  function setModel(model: OFModelConfig) {
    config.value.model = model
  }
  function setPromptTemplate(prompts: OFPromptItem[]) {
    config.value.prompt_template = prompts
  }
  function addOutput(output: { variable: string; value_selector: string[] }) {
    config.value.outputs.push(output)
  }
  function removeOutput(index: number) {
    config.value.outputs.splice(index, 1)
  }

  function exportConfig(): Partial<OFLLMNodeConfig> {
    return {
      title: config.value.title,
      desc: config.value.desc,
      model: config.value.model,
      prompt_template: config.value.prompt_template,
      outputs: config.value.outputs
    }
  }

  function clear() {
    currentNodeId.value = null
    config.value = {
      nodeId: '',
      title: 'LLM',
      desc: '',
      model: { provider: '', name: '' },
      prompt_template: [],
      outputs: []
    }
  }

  return {
    currentNodeId,
    config,
    loadConfig,
    setTitle,
    setDesc,
    setModel,
    setPromptTemplate,
    addOutput,
    removeOutput,
    exportConfig,
    clear
  }
})
