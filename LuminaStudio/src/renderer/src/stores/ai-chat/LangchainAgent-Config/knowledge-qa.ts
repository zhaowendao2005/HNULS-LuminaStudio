import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface KnowledgeQaConfig {
  planNode: {
    providerId: string | null
    modelId: string | null
  }
  retrievalNode: {
    enableRerank: boolean
    rerankProviderId: string | null
    rerankModelId: string | null
    topK: number
  }
  summaryNode: {
    providerId: string | null
    modelId: string | null
  }
  graph: {
    maxIterations: number
  }
}

export const useKnowledgeQaConfigStore = defineStore(
  'knowledge-qa-config',
  () => {
    const config = ref<KnowledgeQaConfig>({
      planNode: {
        providerId: null,
        modelId: null
      },
      retrievalNode: {
        enableRerank: false,
        rerankProviderId: null,
        rerankModelId: null,
        topK: 4
      },
      summaryNode: {
        providerId: null,
        modelId: null
      },
      graph: {
        maxIterations: 5
      }
    })

    function updatePlanNode(providerId: string | null, modelId: string | null) {
      config.value.planNode.providerId = providerId
      config.value.planNode.modelId = modelId
    }

    function updateRetrievalNode(
      enableRerank: boolean,
      rerankProviderId: string | null,
      rerankModelId: string | null,
      topK: number
    ) {
      config.value.retrievalNode.enableRerank = enableRerank
      config.value.retrievalNode.rerankProviderId = rerankProviderId
      config.value.retrievalNode.rerankModelId = rerankModelId
      config.value.retrievalNode.topK = topK
    }

    function updateSummaryNode(providerId: string | null, modelId: string | null) {
      config.value.summaryNode.providerId = providerId
      config.value.summaryNode.modelId = modelId
    }

    function updateGraph(maxIterations: number) {
      config.value.graph.maxIterations = maxIterations
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
    persist: true
  }
)
