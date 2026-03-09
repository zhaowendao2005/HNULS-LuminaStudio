import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  OFVarType,
  OFBlockEnum,
  type OFIfElseCondition,
  type OFNode,
  type OFLoopNodeData,
  type OFLoopNodeConfig,
  type OFLoopVariableData
} from '@shared/Orchestraflow-types'
import { resolveOFNodeDefinition } from '@shared/Orchestraflow-types/node-definition-registry'

function createDefaultNodeData(nodeId: string, title: string): OFLoopNodeData {
  return resolveOFNodeDefinition(OFBlockEnum.Loop).editor.createDefaultData({
    nodeId,
    title
  }) as OFLoopNodeData
}

function toLoopNodeConfig(nodeId: string, data: OFLoopNodeData): OFLoopNodeConfig {
  return {
    nodeId,
    ...data
  }
}

function createDefaultLoopVariable(): OFLoopVariableData {
  return {
    id: `loop_var_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    variable: 'counter',
    label: '',
    type: OFVarType.Number,
    value_type: 'constant',
    value: 0
  }
}

function createUniqueLoopVariableName(existingVariables: OFLoopVariableData[]): string {
  const occupiedNames = new Set(
    existingVariables.map((item) => String(item.variable || '').trim()).filter(Boolean)
  )
  if (!occupiedNames.has('counter')) return 'counter'

  let index = 2
  while (occupiedNames.has(`counter_${index}`)) {
    index += 1
  }
  return `counter_${index}`
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
  return toLoopNodeConfig('', createDefaultNodeData('', '循环'))
}

function normalizeConfig(nodeId: string, data: Partial<OFLoopNodeConfig>): OFLoopNodeConfig {
  const defaultNodeData = createDefaultNodeData(nodeId, '循环')
  const normalizedData = resolveOFNodeDefinition(OFBlockEnum.Loop).editor.normalizeData({
    node: {
      id: nodeId,
      type: 'loop',
      position: { x: 0, y: 0 },
      data: {
        ...defaultNodeData,
        ...data
      }
    } as OFNode,
    helpers: {
      normalizeNode(node) {
        const definition = resolveOFNodeDefinition(node.data.type)
        return {
          ...node,
          type: definition.meta.vueFlowType,
          data: definition.editor.normalizeData({
            node,
            helpers: this
          })
        }
      }
    }
  }) as OFLoopNodeData

  return toLoopNodeConfig(nodeId, normalizedData)
}

export const useLoopNodeConfigStore = defineStore('of-loop-node-config', () => {
  const currentNodeId = ref<string | null>(null)
  const config = ref<OFLoopNodeConfig>(createDefaultConfig())

  function loadConfig(nodeId: string, data: Partial<OFLoopNodeConfig>) {
    currentNodeId.value = nodeId
    config.value = normalizeConfig(nodeId, data)
  }

  function patchConfig(patch: Partial<OFLoopNodeConfig>) {
    config.value = normalizeConfig(config.value.nodeId || '', {
      ...config.value,
      ...patch
    })
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
    createUniqueLoopVariableName,
    createDefaultCondition
  }
})
