import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  OFBlockEnum,
  type OFNode,
  type OFPaperRetrievalNodeConfig,
  type OFPaperRetrievalNodeData,
  resolveOFNodeDefinition
} from '@shared/Orchestraflow-types'

function createDefaultNodeData(nodeId: string, title: string): OFPaperRetrievalNodeData {
  return resolveOFNodeDefinition(OFBlockEnum.PaperRetrieval).editor.createDefaultData({
    nodeId,
    title
  }) as OFPaperRetrievalNodeData
}

function toPaperRetrievalNodeConfig(
  nodeId: string,
  data: OFPaperRetrievalNodeData
): OFPaperRetrievalNodeConfig {
  return {
    nodeId,
    ...data
  }
}

function createDefaultConfig(): OFPaperRetrievalNodeConfig {
  return toPaperRetrievalNodeConfig('', createDefaultNodeData('', '论文检索'))
}

function normalizeConfig(
  nodeId: string,
  data: Partial<OFPaperRetrievalNodeConfig>
): OFPaperRetrievalNodeConfig {
  const definition = resolveOFNodeDefinition(OFBlockEnum.PaperRetrieval)
  const defaultNodeData = createDefaultNodeData(nodeId, '论文检索')
  const normalizedData = definition.editor.normalizeData({
    node: {
      id: nodeId,
      type: String(definition.runtime.vueFlowType || OFBlockEnum.PaperRetrieval),
      position: { x: 0, y: 0 },
      data: {
        ...defaultNodeData,
        ...data
      }
    } as OFNode,
    helpers: {
      normalizeNode(node) {
        const currentDefinition = resolveOFNodeDefinition(node.data.type)
        return {
          ...node,
          type: currentDefinition.runtime.vueFlowType,
          data: currentDefinition.editor.normalizeData({
            node,
            helpers: this
          })
        }
      }
    }
  }) as OFPaperRetrievalNodeData

  return toPaperRetrievalNodeConfig(nodeId, normalizedData)
}

/**
 * paper-retrieval 节点配置 store。
 *
 * 这里专门给 renderer 面板使用，负责：
 * 1. 把当前节点数据标准化成可编辑 config。
 * 2. 在局部 patch 时保持 output / 默认字段同步。
 */
export const usePaperRetrievalNodeConfigStore = defineStore(
  'of-paper-retrieval-node-config',
  () => {
    const currentNodeId = ref<string | null>(null)
    const config = ref<OFPaperRetrievalNodeConfig>(createDefaultConfig())

    function loadConfig(nodeId: string, data: Partial<OFPaperRetrievalNodeConfig>) {
      currentNodeId.value = nodeId
      config.value = normalizeConfig(nodeId, data)
    }

    function patchConfig(patch: Partial<OFPaperRetrievalNodeConfig>) {
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
  }
)
