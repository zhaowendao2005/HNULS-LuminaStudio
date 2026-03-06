import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { OFIterationNodeConfig } from '@shared/Orchestraflow-types'

function createDefaultConfig(): OFIterationNodeConfig {
  return {
    nodeId: '',
    title: '迭代',
    desc: '',
    iterationMode: 'fixed-count',
    iterationCount: 3,
    iterationSource: '',
    mockTemplateId: 'llm-summary',
    graph: {
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 }
    },
    preview: {
      label: '迭代开始',
      nodes: [
        { id: 'preview-start', type: 'iteration-start', title: '迭代开始' }
      ]
    },
    mockRun: {
      iterations: [],
      summary: '',
      finalOutput: ''
    },
    output: { variables: [] }
  }
}

export const useIterationNodeConfigStore = defineStore('of-iteration-node-config', () => {
  const currentNodeId = ref<string | null>(null)
  const config = ref<OFIterationNodeConfig>(createDefaultConfig())

  function loadConfig(nodeId: string, data: Partial<OFIterationNodeConfig>) {
    currentNodeId.value = nodeId
    config.value = {
      ...createDefaultConfig(),
      ...data,
      nodeId
    }
  }

  function patchConfig(patch: Partial<OFIterationNodeConfig>) {
    config.value = {
      ...config.value,
      ...patch
    }
  }

  function clear() {
    currentNodeId.value = null
    config.value = createDefaultConfig()
  }

  return {
    currentNodeId,
    config,
    loadConfig,
    patchConfig,
    clear
  }
})
