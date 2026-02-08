import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { KnowledgeQaModelConfig } from '@shared/langchain-client.types'

export const useKnowledgeQaConfigStore = defineStore(
  'knowledge-qa-config',
  () => {
    const config = ref<KnowledgeQaModelConfig>({
      planModel: {
        providerId: null,
        modelId: null,
        systemPromptInstruction: undefined,
        systemPromptConstraint: undefined
      },
      summaryModel: {
        providerId: null,
        modelId: null,
        systemPromptInstruction: undefined,
        systemPromptConstraint: undefined
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

    function updatePlanPromptInstruction(instruction: string | undefined) {
      config.value = {
        ...config.value,
        planModel: {
          ...config.value.planModel,
          systemPromptInstruction: instruction
        }
      }
    }

    function updatePlanPromptConstraint(constraint: string | undefined) {
      config.value = {
        ...config.value,
        planModel: {
          ...config.value.planModel,
          systemPromptConstraint: constraint
        }
      }
    }

    function updateSummaryPromptInstruction(instruction: string | undefined) {
      config.value = {
        ...config.value,
        summaryModel: {
          ...config.value.summaryModel,
          systemPromptInstruction: instruction
        }
      }
    }

    function updateSummaryPromptConstraint(constraint: string | undefined) {
      config.value = {
        ...config.value,
        summaryModel: {
          ...config.value.summaryModel,
          systemPromptConstraint: constraint
        }
      }
    }

    return {
      config,
      updatePlanNode,
      updateRetrievalNode,
      updateSummaryNode,
      updateGraph,
      updatePlanPromptInstruction,
      updatePlanPromptConstraint,
      updateSummaryPromptInstruction,
      updateSummaryPromptConstraint
    }
  },
  {
    persist: {
      key: 'knowledge-qa-config',
      storage: localStorage
    }
  }
)
