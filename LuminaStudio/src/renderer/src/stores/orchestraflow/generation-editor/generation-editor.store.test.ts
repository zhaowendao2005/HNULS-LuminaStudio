import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type {
  GenerationDesignDocument,
  GenerationDocument,
  GenerationPlanningDocument,
  GenerationRuntimeStageKey,
  GenerationSessionDetail,
  GenerationSessionSummary,
  GenerationStageConfig,
  GenerationStageKey
} from '@preload/types'
import { createEmptyOFPlanningDocument, buildOFPlanningMarkdown } from '@shared/Orchestraflow-types'

const {
  listSessionsMock,
  createSessionMock,
  compileDesignDocumentToWorkflowMock,
  deleteSessionMock,
  getSessionDetailMock,
  getGlobalSettingsMock,
  updateGlobalSettingsMock
} = vi.hoisted(() => ({
  listSessionsMock: vi.fn<() => Promise<GenerationSessionSummary[]>>(),
  createSessionMock: vi.fn<(request: { title: string }) => Promise<GenerationSessionDetail>>(),
  compileDesignDocumentToWorkflowMock: vi.fn(),
  deleteSessionMock: vi.fn<(sessionId: string) => Promise<void>>(),
  getSessionDetailMock: vi.fn<(sessionId: string) => Promise<GenerationSessionDetail>>(),
  getGlobalSettingsMock: vi.fn<() => Promise<{ persistRawLlmData: boolean }>>(),
  updateGlobalSettingsMock: vi.fn<() => Promise<{ persistRawLlmData: boolean }>>()
}))

vi.mock('./sessions/session-list.datasource', () => ({
  SessionListDataSource: {
    listSessions: listSessionsMock,
    createSession: createSessionMock,
    deleteSession: deleteSessionMock
  }
}))

vi.mock('./sessions/session-detail-cache.datasource', () => ({
  SessionDetailCacheDataSource: {
    getSessionDetail: getSessionDetailMock
  }
}))

vi.mock('./generation-editor.datasource', async () => {
  const actual = await vi.importActual<typeof import('./generation-editor.datasource')>(
    './generation-editor.datasource'
  )

  return {
    ...actual,
    OrchestflowGenerationEditorDataSource: {
      listSessions: vi.fn(),
      createSession: vi.fn(),
      deleteSession: vi.fn(),
      getSessionDetail: vi.fn(),
      updateSessionState: vi.fn(),
      saveStageConfig: vi.fn(),
      saveDocument: vi.fn(),
      savePlanningDocument: vi.fn(),
      selectPlanningDocument: vi.fn(),
      getOrCreatePlanningDocumentFromMessage: vi.fn(),
      createDesignDocumentFromPlanning: vi.fn(),
      listDesignDocuments: vi.fn(),
      saveDesignDocument: vi.fn(),
      compileDesignDocumentToWorkflow: compileDesignDocumentToWorkflowMock,
      selectDesignDocument: vi.fn(),
      deleteDesignDocument: vi.fn(),
      applyPlanningCommandProposal: vi.fn(),
      rejectPlanningCommandProposal: vi.fn(),
      getGlobalSettings: getGlobalSettingsMock,
      updateGlobalSettings: updateGlobalSettingsMock,
      sendMessage: vi.fn(),
      abortMessage: vi.fn(),
      onStream: vi.fn(() => () => {})
    }
  }
})

import { useOrchestflowGenerationEditorStore } from './generation-editor.store'

function buildStageConfig(stageKey: GenerationStageKey): GenerationStageConfig {
  return {
    stageKey,
    providerId: null,
    modelId: null,
    sdkVendor: null,
    memoryRounds: 6,
    copilotMemoryRounds: 4,
    autoApproved: false,
    activePlanningDocumentId: null,
    activeDesignDocumentId: null
  }
}

function buildDocument(documentKey: GenerationStageKey): GenerationDocument {
  return {
    documentKey,
    title: `${documentKey}-title`,
    fileName: `${documentKey}.md`,
    summary: '',
    content: ''
  }
}

function buildPlanningDocument(id: string): GenerationPlanningDocument {
  const document = createEmptyOFPlanningDocument()
  const content = buildOFPlanningMarkdown(document)
  return {
    id,
    sessionId: 'session-a',
    stageKey: 'analysis',
    sourceMessageId: 'message-1',
    title: 'analysis-planning',
    sourceMarkdown: content,
    content,
    sections: document.sections,
    createdAt: '2026-03-12T00:00:00.000Z',
    updatedAt: '2026-03-12T00:00:00.000Z'
  }
}

function buildDesignDocument(id: string, planningDocumentId: string): GenerationDesignDocument {
  return {
    id,
    sessionId: 'session-a',
    planningDocumentId,
    planningSourceMessageId: 'message-1',
    title: '规划设计 V1',
    version: 1,
    status: 'draft',
    sourceSnapshotMarkdown: '# 需求分析',
    contentFormat: 'of-blueprint-section-v1',
    content: '',
    summary: '',
    diagnosticsJson: null,
    latestGenerationMessageId: null,
    derivedTargetType: null,
    derivedTargetId: null,
    derivedStatus: null,
    createdAt: '2026-03-12T00:00:00.000Z',
    updatedAt: '2026-03-12T00:00:00.000Z'
  }
}

function buildSessionSummary(
  id: string,
  currentStage: GenerationRuntimeStageKey = 'analysis'
): GenerationSessionSummary {
  return {
    id,
    title: `session-${id}`,
    currentStage,
    summary: `summary-${id}`,
    analysisTurnCount: 0,
    planGenerated: false,
    createdAt: '2026-03-12T00:00:00.000Z',
    updatedAt: '2026-03-12T00:00:00.000Z'
  }
}

function buildSessionDetail(
  id: string,
  currentStage: GenerationRuntimeStageKey = 'analysis'
): GenerationSessionDetail {
  const planningDocument = buildPlanningDocument(`planning-${id}`)
  return {
    ...buildSessionSummary(id, currentStage),
    stageConfigs: [
      buildStageConfig('analysis'),
      buildStageConfig('design'),
      buildStageConfig('verify')
    ],
    documents: [buildDocument('analysis'), buildDocument('design'), buildDocument('verify')],
    planningDocuments: [planningDocument],
    designDocuments: [buildDesignDocument(`design-${id}`, planningDocument.id)],
    messages: []
  }
}

describe('generation-editor.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    getGlobalSettingsMock.mockResolvedValue({ persistRawLlmData: false })
    updateGlobalSettingsMock.mockResolvedValue({ persistRawLlmData: false })
  })

  it('creates a default session when initialize finds no sessions', async () => {
    const created = buildSessionDetail('created-session')
    listSessionsMock.mockResolvedValue([])
    createSessionMock.mockResolvedValue(created)

    const store = useOrchestflowGenerationEditorStore()
    await store.initialize()

    expect(createSessionMock).toHaveBeenCalledWith({ title: '新建生成会话' })
    expect(store.viewStatus).toBe('ready')
    expect(store.currentSession?.id).toBe('created-session')
    expect(store.selectedSessionId).toBe('created-session')
    expect(store.resolvedSessionId).toBe('created-session')
    expect(store.globalSettings.persistRawLlmData).toBe(false)
  })

  it('keeps the current session when switching target detail fails', async () => {
    const sessionA = buildSessionSummary('session-a')
    const sessionB = buildSessionSummary('session-b', 'design')
    const detailA = buildSessionDetail('session-a')

    listSessionsMock.mockResolvedValue([sessionA, sessionB])
    getSessionDetailMock.mockImplementation(async (sessionId) => {
      if (sessionId === 'session-a') return detailA
      throw new Error('Session not found: session-b')
    })

    const store = useOrchestflowGenerationEditorStore()
    await store.initialize()
    await store.selectSession('session-b')

    expect(store.currentSession?.id).toBe('session-a')
    expect(store.selectedSessionId).toBe('session-a')
    expect(store.resolvedSessionId).toBe('session-a')
    expect(store.viewStatus).toBe('ready')
    expect(store.lastErrorMessage).toContain('session-b')
  })

  it('creates a replacement session after deleting the last session', async () => {
    const onlySession = buildSessionSummary('only-session')
    const onlyDetail = buildSessionDetail('only-session')
    const replacement = buildSessionDetail('replacement-session')

    listSessionsMock.mockResolvedValue([onlySession])
    getSessionDetailMock.mockResolvedValue(onlyDetail)
    createSessionMock.mockResolvedValue(replacement)
    deleteSessionMock.mockResolvedValue()

    const store = useOrchestflowGenerationEditorStore()
    await store.initialize()
    await store.deleteSession('only-session')

    expect(createSessionMock).toHaveBeenCalledWith({ title: '新建生成会话' })
    expect(store.currentSession?.id).toBe('replacement-session')
    expect(store.selectedSessionId).toBe('replacement-session')
    expect(store.viewStatus).toBe('ready')
  })

  it('compiles the active design document into a workflow and syncs derived fields', async () => {
    const detail = buildSessionDetail('session-a', 'design')
    const designDocument = detail.designDocuments[0]
    designDocument.status = 'valid'
    designDocument.content = `OFT/1
[workflow]
name = "section-demo"
author = "tester"

[node.start]
type = "start"
inputs = [{"variable":"user_query","schema":{"type":"string","default":"hello"}}]

[node.llm_main]
type = "llm"
model = "openai/gpt-4.1-mini"
prompt = """
请总结输入。
"""
struct = "answer:string"

[node.end]
type = "end"
outputs = [{"variable":"result","schema":{"type":"string"},"source":{"mode":"ref","ref":"@llm_main.structured_output.answer"}}]

[graph]
edges = ["start.source -> llm_main.target", "llm_main.source -> end.target"]`
    designDocument.summary = '规划设计稿 DSL 已通过解析与编译校验。'
    detail.stageConfigs = detail.stageConfigs.map((config) =>
      config.stageKey === 'design'
        ? { ...config, activeDesignDocumentId: designDocument.id }
        : config
    )

    const compiledDesignDocument: GenerationDesignDocument = {
      ...designDocument,
      derivedTargetType: 'workflow',
      derivedTargetId: 'compiled-workflow-1',
      derivedStatus: 'compiled'
    }

    listSessionsMock.mockResolvedValue([buildSessionSummary('session-a', 'design')])
    getSessionDetailMock.mockResolvedValue(detail)
    compileDesignDocumentToWorkflowMock.mockResolvedValue({
      designDocument: compiledDesignDocument,
      workflowId: 'compiled-workflow-1'
    })

    const store = useOrchestflowGenerationEditorStore()
    await store.initialize()

    const workflowId = await store.compileDesignDocumentToWorkflow()

    expect(compileDesignDocumentToWorkflowMock).toHaveBeenCalledWith({
      sessionId: 'session-a',
      designDocumentId: designDocument.id
    })
    expect(workflowId).toBe('compiled-workflow-1')
    expect(store.activeDesignDocument?.derivedTargetType).toBe('workflow')
    expect(store.activeDesignDocument?.derivedTargetId).toBe('compiled-workflow-1')
    expect(store.activeDesignDocument?.derivedStatus).toBe('compiled')
  })
})
