import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWorkflowGenerationStore } from './workflow-generation.store'

const orchestraflowApi = {
  listGenerationSessions: vi.fn(async () => ({ success: true, data: [] }))
}

describe('workflow generation store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    ;(globalThis as any).window = {
      api: {
        orchestraflow: {
          ...orchestraflowApi,
          getGenerationSession: vi.fn(),
          createGenerationSession: vi.fn(),
          sendGenerationPrompt: vi.fn(),
          advanceGenerationPhase: vi.fn(),
          rollbackGenerationCheckpoint: vi.fn(),
          updateGenerationPhaseModels: vi.fn(),
          confirmGenerationSession: vi.fn(),
          deleteGenerationSession: vi.fn()
        }
      }
    }
  })

  it('loads session cards', async () => {
    const store = useWorkflowGenerationStore()
    await store.fetchSessions()
    expect(orchestraflowApi.listGenerationSessions).toHaveBeenCalled()
  })
})
