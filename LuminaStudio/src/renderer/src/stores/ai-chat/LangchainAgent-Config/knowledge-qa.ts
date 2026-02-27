import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { KnowledgeQaModelConfig } from '@shared/langchain-client.types'

export const useKnowledgeQaConfigStore = defineStore(
  'knowledge-qa-config',
  () => {
    const config = ref<KnowledgeQaModelConfig>({
      initialPlanModel: {
        providerId: null,
        modelId: null,
        systemPromptInstruction: undefined,
        systemPromptConstraint: undefined
      },
      loopPlanModel: {
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

    function updateInitialPlanNode(providerId: string | null, modelId: string | null) {
      config.value = {
        ...config.value,
        initialPlanModel: {
          ...config.value.initialPlanModel,
          providerId,
          modelId
        }
      }
    }

    function updateLoopPlanNode(providerId: string | null, modelId: string | null) {
      config.value = {
        ...config.value,
        loopPlanModel: {
          ...config.value.loopPlanModel,
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

    function updateInitialPlanPromptInstruction(instruction: string | undefined) {
      config.value = {
        ...config.value,
        initialPlanModel: {
          ...config.value.initialPlanModel,
          systemPromptInstruction: instruction
        }
      }
    }

    function updateInitialPlanPromptConstraint(constraint: string | undefined) {
      config.value = {
        ...config.value,
        initialPlanModel: {
          ...config.value.initialPlanModel,
          systemPromptConstraint: constraint
        }
      }
    }

    function updateLoopPlanPromptInstruction(instruction: string | undefined) {
      config.value = {
        ...config.value,
        loopPlanModel: {
          ...config.value.loopPlanModel,
          systemPromptInstruction: instruction
        }
      }
    }

    function updateLoopPlanPromptConstraint(constraint: string | undefined) {
      config.value = {
        ...config.value,
        loopPlanModel: {
          ...config.value.loopPlanModel,
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
      updateInitialPlanNode,
      updateLoopPlanNode,
      updateRetrievalNode,
      updateSummaryNode,
      updateGraph,
      updateInitialPlanPromptInstruction,
      updateInitialPlanPromptConstraint,
      updateLoopPlanPromptInstruction,
      updateLoopPlanPromptConstraint,
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
