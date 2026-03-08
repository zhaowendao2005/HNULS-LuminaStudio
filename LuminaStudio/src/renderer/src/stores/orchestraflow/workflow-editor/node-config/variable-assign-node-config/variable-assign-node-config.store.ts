import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  OFVarType,
  buildVariableAssignOutputVariables,
  type OFVariableAssignNodeConfig,
  type OFVariableAssignRule
} from '@shared/Orchestraflow-types'

function createDefaultRule(): OFVariableAssignRule {
  return {
    id: `assign_rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    source_mode: 'variable',
    source_selector: [],
    source_path: '',
    source_label: '',
    source_type: OFVarType.String,
    constant_value: '',
    target_variable: '',
    target_label: '',
    target_type: OFVarType.String,
    description: ''
  }
}

function createDefaultConfig(): OFVariableAssignNodeConfig {
  return {
    nodeId: '',
    title: '变量赋值',
    desc: '',
    rules: [createDefaultRule()],
    output: { variables: [] }
  }
}

export const useVariableAssignNodeConfigStore = defineStore(
  'of-variable-assign-node-config',
  () => {
    const currentNodeId = ref<string | null>(null)
    const config = ref<OFVariableAssignNodeConfig>(createDefaultConfig())

    function loadConfig(nodeId: string, data: Partial<OFVariableAssignNodeConfig>) {
      currentNodeId.value = nodeId
      const nextConfig = {
        ...createDefaultConfig(),
        ...data,
        nodeId
      }
      config.value = {
        ...nextConfig,
        output: {
          variables: buildVariableAssignOutputVariables(
            nextConfig.title,
            nextConfig.rules || [],
            nodeId
          )
        }
      }
    }

    function patchConfig(patch: Partial<OFVariableAssignNodeConfig>) {
      const nextConfig = {
        ...config.value,
        ...patch
      }
      config.value = {
        ...nextConfig,
        output: {
          variables: buildVariableAssignOutputVariables(
            nextConfig.title,
            nextConfig.rules || [],
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
      createDefaultRule
    }
  }
)
