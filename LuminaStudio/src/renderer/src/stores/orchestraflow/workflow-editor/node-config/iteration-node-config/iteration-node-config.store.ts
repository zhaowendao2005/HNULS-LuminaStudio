import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  buildIterationOutputVariables,
  type OFIterationNodeConfig
} from '@shared/Orchestraflow-types'

const DEFAULT_SUBGRAPH_VIEWPORT = { x: 0, y: 0, zoom: 1 }

function createDefaultConfig(): OFIterationNodeConfig {
  return {
    nodeId: '',
    title: '迭代',
    desc: '',
    iterator_selector: [],
    output_selector: [],
    start_node_id: '',
    subgraph: {
      nodes: [],
      edges: [],
      viewport: { ...DEFAULT_SUBGRAPH_VIEWPORT }
    },
    parallel_mode: 'sequential',
    parallel_nums: 1,
    error_handle_mode: 'terminated',
    flatten_output: true,
    output: { variables: buildIterationOutputVariables('迭代') }
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
