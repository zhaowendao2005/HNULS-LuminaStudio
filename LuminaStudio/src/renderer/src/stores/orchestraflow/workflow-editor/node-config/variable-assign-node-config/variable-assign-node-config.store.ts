import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  OFVarType,
  OFBlockEnum,
  type OFValueSource,
  type OFStandardNodeDefinition,
  type OFNode,
  type OFVariableAssignNodeData,
  type OFVariableAssignNodeConfig,
  type OFVariableAssignRule,
  resolveOFNodeDefinition
} from '@shared/Orchestraflow-types'

function createDefaultNodeData(nodeId: string, title: string): OFVariableAssignNodeData {
  return (
    resolveOFNodeDefinition(
      OFBlockEnum.VariableAssign
    ) as OFStandardNodeDefinition<OFVariableAssignNodeData>
  ).editor.createDefaultData({
    nodeId,
    title
  })
}

function toVariableAssignNodeConfig(
  nodeId: string,
  data: OFVariableAssignNodeData
): OFVariableAssignNodeConfig {
  return {
    nodeId,
    ...data
  }
}

function createDefaultRule(): OFVariableAssignRule {
  return {
    id: `assign_rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    source: {
      mode: 'variable',
      ref: {
        selector: [],
        path: '',
        type: OFVarType.String
      }
    } as OFValueSource,
    source_mode: 'variable',
    source_type: OFVarType.String,
    constant_value: '',
    target_variable: '',
    target_label: '',
    target_type: OFVarType.String,
    description: ''
  }
}

function createDefaultConfig(): OFVariableAssignNodeConfig {
  return toVariableAssignNodeConfig('', createDefaultNodeData('', '变量赋值'))
}

function normalizeConfig(
  nodeId: string,
  data: Partial<OFVariableAssignNodeConfig>
): OFVariableAssignNodeConfig {
  const defaultNodeData = createDefaultNodeData(nodeId, '变量赋值')
  const normalizedData = (
    resolveOFNodeDefinition(
      OFBlockEnum.VariableAssign
    ) as OFStandardNodeDefinition<OFVariableAssignNodeData>
  ).editor.normalizeData({
    node: {
      id: nodeId,
      type: 'variable-assign',
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
  })

  return toVariableAssignNodeConfig(nodeId, normalizedData)
}

export const useVariableAssignNodeConfigStore = defineStore(
  'of-variable-assign-node-config',
  () => {
    const currentNodeId = ref<string | null>(null)
    const config = ref<OFVariableAssignNodeConfig>(createDefaultConfig())

    function loadConfig(nodeId: string, data: Partial<OFVariableAssignNodeConfig>) {
      currentNodeId.value = nodeId
      config.value = normalizeConfig(nodeId, {
        ...data,
        rules: data.rules?.length ? data.rules : createDefaultConfig().rules
      })
    }

    function patchConfig(patch: Partial<OFVariableAssignNodeConfig>) {
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
      createDefaultRule
    }
  }
)
