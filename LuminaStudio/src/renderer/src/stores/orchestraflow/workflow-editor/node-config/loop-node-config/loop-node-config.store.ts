import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  OFVarType,
  buildLoopOutputVariables,
  type OFIfElseCondition,
  type OFLoopNodeConfig,
  type OFLoopVariableData
} from '@shared/Orchestraflow-types'

const DEFAULT_SUBGRAPH_VIEWPORT = { x: 0, y: 0, zoom: 1 }

function createDefaultLoopVariable(): OFLoopVariableData {
  return {
    id: `loop_var_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    variable: 'counter',
    label: 'counter',
    type: OFVarType.Number,
    value_type: 'constant',
    value: 0
  }
}

function createDefaultCondition(): OFIfElseCondition {
  return {
    id: `loop_condition_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    variable_selector: [],
    variable_path: '',
    variable_label: '',
    variable_type: OFVarType.Number,
    operator: 'gte',
    compare_source_mode: 'constant',
    value: 0,
    value_type: OFVarType.Number
  }
}

function createDefaultConfig(): OFLoopNodeConfig {
  const loopVariables = [createDefaultLoopVariable()]
  return {
    nodeId: '',
    title: '循环',
    desc: '',
    loop_count: 10,
    loop_variables: loopVariables,
    break_conditions: [],
    logical_operator: 'and',
    start_node_id: '',
    subgraph: {
      nodes: [],
      edges: [],
      viewport: { ...DEFAULT_SUBGRAPH_VIEWPORT }
    },
    output: {
      variables: buildLoopOutputVariables('循环', loopVariables)
    }
  }
}

export const useLoopNodeConfigStore = defineStore('of-loop-node-config', () => {
  const currentNodeId = ref<string | null>(null)
  const config = ref<OFLoopNodeConfig>(createDefaultConfig())

  function loadConfig(nodeId: string, data: Partial<OFLoopNodeConfig>) {
    currentNodeId.value = nodeId
    const nextConfig = {
      ...createDefaultConfig(),
      ...data,
      nodeId
    }
    config.value = {
      ...nextConfig,
      output: {
        variables: buildLoopOutputVariables(nextConfig.title, nextConfig.loop_variables || [], nodeId)
      }
    }
  }

  function patchConfig(patch: Partial<OFLoopNodeConfig>) {
    const nextConfig = {
      ...config.value,
      ...patch
    }
    config.value = {
      ...nextConfig,
      output: {
        variables: buildLoopOutputVariables(
          nextConfig.title,
          nextConfig.loop_variables || [],
          nextConfig.nodeId
        )
      }
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
    clear,
    createDefaultLoopVariable,
    createDefaultCondition
  }
})
