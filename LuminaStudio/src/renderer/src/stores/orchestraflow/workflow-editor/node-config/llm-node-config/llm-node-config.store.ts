/**
 * LLM Node Config Store
 * LLM节点配置管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  OFLLMNodeConfig,
  OFModelConfig,
  OFPromptItem,
  OFVariable
} from '@shared/Orchestraflow-types'
import type { OFLLMModelParamsPanelState } from './llm-node-config.types'

export const useLLMNodeConfigStore = defineStore('of-llm-node-config', () => {
  const currentNodeId = ref<string | null>(null)
  const modelParamsPanel = ref<OFLLMModelParamsPanelState>({
    visible: false,
    anchorRect: null,
    activeNodeId: null
  })
  const config = ref<OFLLMNodeConfig>({
    nodeId: '',
    title: 'LLM',
    desc: '',
    model: {
      provider: '',
      name: '',
      completion_params: {
        temperature: 1,
        top_p: 1
      }
    },
    prompt_template: [],
    structured_output: {
      enabled: false,
      schema: null
    },
    output: { variables: [] }
  })

  function loadConfig(nodeId: string, data: Partial<OFLLMNodeConfig>) {
    currentNodeId.value = nodeId
    config.value = {
      nodeId,
      title: data.title || 'LLM',
      desc: data.desc || '',
      model: data.model || {
        provider: '',
        name: '',
        completion_params: {
          temperature: 1,
          top_p: 1
        }
      },
      prompt_template: data.prompt_template || [],
      structured_output: data.structured_output || {
        enabled: false,
        schema: null
      },
      output: data.output || { variables: [] }
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
  function setStructuredOutput(structuredOutput: OFLLMNodeConfig['structured_output']) {
    config.value.structured_output = structuredOutput
  }
  function addOutput(output: OFVariable) {
    config.value.output.variables.push(output)
  }
  function removeOutput(index: number) {
    config.value.output.variables.splice(index, 1)
  }

  function openModelParamsPanel(nodeId: string, anchorRect?: DOMRect | null) {
    modelParamsPanel.value = {
      visible: true,
      anchorRect: anchorRect || null,
      activeNodeId: nodeId
    }
  }

  function closeModelParamsPanel() {
    modelParamsPanel.value = {
      visible: false,
      anchorRect: null,
      activeNodeId: null
    }
  }

  function setModelParamsPanelAnchor(anchorRect?: DOMRect | null) {
    modelParamsPanel.value.anchorRect = anchorRect || null
  }

  function exportConfig(): Partial<OFLLMNodeConfig> {
    return {
      title: config.value.title,
      desc: config.value.desc,
      model: config.value.model,
      prompt_template: config.value.prompt_template,
      structured_output: config.value.structured_output,
      output: config.value.output
    }
  }

  function clear() {
    currentNodeId.value = null
    closeModelParamsPanel()
    config.value = {
      nodeId: '',
      title: 'LLM',
      desc: '',
      model: {
        provider: '',
        name: '',
        completion_params: {
          temperature: 1,
          top_p: 1
        }
      },
      prompt_template: [],
      structured_output: {
        enabled: false,
        schema: null
      },
      output: { variables: [] }
    }
  }

  return {
    currentNodeId,
    config,
    modelParamsPanel,
    loadConfig,
    setTitle,
    setDesc,
    setModel,
    setPromptTemplate,
    setStructuredOutput,
    addOutput,
    removeOutput,
    openModelParamsPanel,
    closeModelParamsPanel,
    setModelParamsPanelAnchor,
    exportConfig,
    clear
  }
})
