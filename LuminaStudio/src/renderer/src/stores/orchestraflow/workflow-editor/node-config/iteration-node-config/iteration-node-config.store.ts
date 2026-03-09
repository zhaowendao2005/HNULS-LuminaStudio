import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  OFBlockEnum,
  type OFContainerNodeDefinition,
  type OFIterationNodeConfig,
  type OFIterationNodeData,
  type OFNode
} from '@shared/Orchestraflow-types'
import { resolveOFNodeDefinition } from '@shared/Orchestraflow-types/node-definition-registry'

function createDefaultNodeData(nodeId: string, title: string): OFIterationNodeData {
  return (
    resolveOFNodeDefinition(OFBlockEnum.Iteration) as OFContainerNodeDefinition<OFIterationNodeData>
  ).editor.createDefaultData({
    nodeId,
    title
  })
}

function toIterationNodeConfig(nodeId: string, data: OFIterationNodeData): OFIterationNodeConfig {
  return {
    nodeId,
    ...data
  }
}

function createDefaultConfig(): OFIterationNodeConfig {
  return toIterationNodeConfig('', createDefaultNodeData('', '迭代'))
}

function normalizeConfig(
  nodeId: string,
  data: Partial<OFIterationNodeConfig>
): OFIterationNodeConfig {
  const defaultNodeData = createDefaultNodeData(nodeId, '迭代')
  const normalizedData = (
    resolveOFNodeDefinition(OFBlockEnum.Iteration) as OFContainerNodeDefinition<OFIterationNodeData>
  ).editor.normalizeData({
    node: {
      id: nodeId,
      type: 'iteration',
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

  return toIterationNodeConfig(nodeId, normalizedData)
}

export const useIterationNodeConfigStore = defineStore('of-iteration-node-config', () => {
  const currentNodeId = ref<string | null>(null)
  const config = ref<OFIterationNodeConfig>(createDefaultConfig())

  function loadConfig(nodeId: string, data: Partial<OFIterationNodeConfig>) {
    currentNodeId.value = nodeId
    config.value = normalizeConfig(nodeId, data)
  }

  function patchConfig(patch: Partial<OFIterationNodeConfig>) {
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
    clear
  }
})
