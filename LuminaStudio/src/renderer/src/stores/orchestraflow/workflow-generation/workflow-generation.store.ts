import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  OFGenerationPhase,
  OFGenerationPhaseModelConfig,
  OFGenerationSession,
  OFGenerationAgentId,
  OFGenerationAgentRuntimeConfig,
  OFGenerationAgentEvent
} from '@shared/Orchestraflow-types'
import { WorkflowGenerationDatasource } from './workflow-generation.datasource'

const datasource = new WorkflowGenerationDatasource()

export const useWorkflowGenerationStore = defineStore('orchestraflow-workflow-generation', () => {
  const sessions = ref<OFGenerationSession[]>([])
  const currentSession = ref<OFGenerationSession | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const agentEvents = ref<OFGenerationAgentEvent[]>([])
  let disposeAgentEvents: (() => void) | null = null

  const sessionCards = computed(() => sessions.value)

  async function fetchSessions() {
    loading.value = true
    try {
      sessions.value = await datasource.listSessions()
    } finally {
      loading.value = false
    }
  }

  function ensureAgentEventBridge() {
    if (disposeAgentEvents) return
    disposeAgentEvents = datasource.onAgentEvent((event) => {
      agentEvents.value = [event, ...agentEvents.value].slice(0, 40)
    })
  }

  async function loadSession(sessionId: string) {
    loading.value = true
    try {
      currentSession.value = await datasource.getSession(sessionId)
      return currentSession.value
    } finally {
      loading.value = false
    }
  }

  async function createSession(data: {
    workflow_name: string
    description?: string
    prompt?: string
  }) {
    saving.value = true
    try {
      currentSession.value = await datasource.createSession(data)
      await fetchSessions()
      return currentSession.value
    } finally {
      saving.value = false
    }
  }

  async function sendPrompt(prompt: string) {
    if (!currentSession.value) throw new Error('No active generation session')
    saving.value = true
    try {
      currentSession.value = await datasource.sendPrompt(currentSession.value.id, prompt)
      await fetchSessions()
      return currentSession.value
    } finally {
      saving.value = false
    }
  }

  async function sendAgentMessage(agentId: OFGenerationAgentId, input: string) {
    if (!currentSession.value) throw new Error('No active generation session')
    saving.value = true
    try {
      currentSession.value = await datasource.sendAgentMessage(
        currentSession.value.id,
        agentId,
        input
      )
      await fetchSessions()
      return currentSession.value
    } finally {
      saving.value = false
    }
  }

  async function resolveApproval(
    approvalId: string,
    decision: 'approved' | 'rejected',
    note?: string
  ) {
    if (!currentSession.value) throw new Error('No active generation session')
    saving.value = true
    try {
      currentSession.value = await datasource.resolveApproval(
        currentSession.value.id,
        approvalId,
        decision,
        note
      )
      await fetchSessions()
      return currentSession.value
    } finally {
      saving.value = false
    }
  }

  async function runStage(stage: 'draft' | 'plan' | 'topology' | 'validation') {
    if (!currentSession.value) throw new Error('No active generation session')
    saving.value = true
    try {
      currentSession.value = await datasource.runStage(currentSession.value.id, stage)
      await fetchSessions()
      return currentSession.value
    } finally {
      saving.value = false
    }
  }

  async function advancePhase(phase: OFGenerationPhase) {
    if (!currentSession.value) throw new Error('No active generation session')
    saving.value = true
    try {
      currentSession.value = await datasource.advancePhase(currentSession.value.id, phase)
      await fetchSessions()
      return currentSession.value
    } finally {
      saving.value = false
    }
  }

  async function rollbackCheckpoint(checkpointId: string) {
    if (!currentSession.value) throw new Error('No active generation session')
    saving.value = true
    try {
      currentSession.value = await datasource.rollbackCheckpoint(
        currentSession.value.id,
        checkpointId
      )
      await fetchSessions()
      return currentSession.value
    } finally {
      saving.value = false
    }
  }

  async function updatePhaseModels(
    phaseModels: Record<OFGenerationPhase, OFGenerationPhaseModelConfig>
  ) {
    if (!currentSession.value) throw new Error('No active generation session')
    saving.value = true
    try {
      currentSession.value = await datasource.updatePhaseModels(
        currentSession.value.id,
        phaseModels
      )
      await fetchSessions()
      return currentSession.value
    } finally {
      saving.value = false
    }
  }

  async function updateAgentConfig(
    agentId: OFGenerationAgentId,
    patch: Partial<OFGenerationAgentRuntimeConfig>
  ) {
    if (!currentSession.value) throw new Error('No active generation session')
    saving.value = true
    try {
      currentSession.value = await datasource.updateAgentConfig(
        currentSession.value.id,
        agentId,
        patch
      )
      await fetchSessions()
      return currentSession.value
    } finally {
      saving.value = false
    }
  }

  async function confirmSession() {
    if (!currentSession.value) throw new Error('No active generation session')
    saving.value = true
    try {
      const result = await datasource.confirmSession(currentSession.value.id)
      currentSession.value = result.session
      await fetchSessions()
      return result
    } finally {
      saving.value = false
    }
  }

  async function deleteSession(sessionId: string) {
    await datasource.deleteSession(sessionId)
    if (currentSession.value?.id === sessionId) currentSession.value = null
    await fetchSessions()
  }

  return {
    sessions,
    currentSession,
    loading,
    saving,
    agentEvents,
    sessionCards,
    ensureAgentEventBridge,
    fetchSessions,
    loadSession,
    createSession,
    sendPrompt,
    sendAgentMessage,
    resolveApproval,
    runStage,
    advancePhase,
    rollbackCheckpoint,
    updatePhaseModels,
    updateAgentConfig,
    confirmSession,
    deleteSession
  }
})
