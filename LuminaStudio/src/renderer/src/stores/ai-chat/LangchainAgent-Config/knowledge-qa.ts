import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { KnowledgeQaModelConfig } from '@shared/langchain-client.types'

export const useKnowledgeQaConfigStore = defineStore(
  'knowledge-qa-config',
  () => {
    const config = ref<KnowledgeQaModelConfig>({
      planModel: {
        providerId: null,
        modelId: null
      },
      summaryModel: {
        providerId: null,
        modelId: null
      },
      retrieval: {
        enableRerank: false,
        rerankModelId: null,
        topK: 4
      },
      graph: {
        maxIterations: 4
      }
    })

    function updatePlanNode(providerId: string | null, modelId: string | null) {
      config.value = {
        ...config.value,
        planModel: {
          providerId,
          modelId
        }
      }
    }

    function updateRetrievalNode(
      enableRerank: boolean,
      rerankModelId: string | null,
      topK: number
    ) {
      config.value = {
        ...config.value,
        retrieval: {
          enableRerank,
          rerankModelId,
          topK
        }
      }
    }

    function updateSummaryNode(providerId: string | null, modelId: string | null) {
      config.value = {
        ...config.value,
        summaryModel: {
          providerId,
          modelId
        }
      }
    }

    function updateGraph(maxIterations: number) {
      config.value = {
        ...config.value,
        graph: {
          maxIterations
        }
      }
    }

    return {
      config,
      updatePlanNode,
      updateRetrievalNode,
      updateSummaryNode,
      updateGraph
    }
  },
  {
    persist: {
      key: 'knowledge-qa-config',
      storage: localStorage
    }
  }
)
