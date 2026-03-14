import { beforeEach, describe, expect, it, vi } from 'vitest'
import type Database from 'better-sqlite3'
import { createHash } from 'crypto'
import type {
  GenerationDesignDocument,
  GenerationMessage,
  GenerationMessageMetaPayload
} from '@preload/types'
import type { DatabaseManager } from '../database-sqlite'
import type { ModelConfigService } from '../model-config'
import { OrchestflowGenerationEditorService } from './orchestflow-generation-editor-service'
import { orchestraflowWorkflowService } from '../orchestraflow/orchestraflow-workflow-service'

vi.mock('../logger', () => ({
  logger: {
    scope: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    })
  }
}))

vi.mock('../orchestraflow/orchestraflow-workflow-service', () => ({
  orchestraflowWorkflowService: {
    createFromWorkflow: vi.fn()
  }
}))

const VALID_DSL = `OFT/1
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

function buildDesignDocument(content: string): GenerationDesignDocument {
  return {
    id: 'design-1',
    sessionId: 'session-1',
    planningDocumentId: 'planning-1',
    planningSourceMessageId: 'message-1',
    title: '规划设计 V1',
    version: 1,
    status: 'valid',
    sourceSnapshotMarkdown: '# snapshot',
    contentFormat: 'of-blueprint-section-v1',
    content,
    summary: '规划设计稿 DSL 已通过解析与编译校验。',
    diagnosticsJson: null,
    latestGenerationMessageId: null,
    derivedTargetType: null,
    derivedTargetId: null,
    derivedStatus: null,
    createdAt: '2026-03-14T00:00:00.000Z',
    updatedAt: '2026-03-14T00:00:00.000Z'
  }
}

function createService(): OrchestflowGenerationEditorService {
  const databaseManagerStub: Pick<DatabaseManager, 'getDatabase'> = {
    getDatabase: () => ({}) as unknown as Database.Database
  }

  return new OrchestflowGenerationEditorService(
    databaseManagerStub as DatabaseManager,
    {} as ModelConfigService
  )
}

describe('OrchestflowGenerationEditorService.compileDesignDocumentToWorkflow', () => {
  const createFromWorkflowMock = vi.mocked(orchestraflowWorkflowService.createFromWorkflow)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a new workflow from valid DSL and persists derived target info', async () => {
    const service = createService()
    const designDocument = buildDesignDocument(VALID_DSL)
    const savedDesignDocument: GenerationDesignDocument = {
      ...designDocument,
      derivedTargetType: 'workflow',
      derivedTargetId: 'workflow-compiled-1',
      derivedStatus: 'compiled'
    }
    const repositoryMock = {
      getDesignDocumentById: vi.fn().mockReturnValue(designDocument),
      saveDesignDocument: vi.fn().mockReturnValue(savedDesignDocument)
    }
    Object.defineProperty(service, 'repository', {
      value: repositoryMock,
      configurable: true
    })
    createFromWorkflowMock.mockResolvedValue({
      id: 'workflow-compiled-1',
      name: 'section-demo',
      description: undefined,
      author: 'tester',
      createdAt: 1,
      updatedAt: 1,
      status: 'draft',
      graph: { nodes: [], edges: [] }
    })

    const result = await service.compileDesignDocumentToWorkflow({
      sessionId: 'session-1',
      designDocumentId: 'design-1'
    })

    expect(createFromWorkflowMock).toHaveBeenCalledTimes(1)
    expect(repositoryMock.saveDesignDocument).toHaveBeenCalledWith({
      sessionId: 'session-1',
      document: expect.objectContaining({
        id: 'design-1',
        derivedTargetType: 'workflow',
        derivedTargetId: 'workflow-compiled-1',
        derivedStatus: 'compiled',
        status: 'valid'
      })
    })
    expect(result).toEqual({
      designDocument: savedDesignDocument,
      workflowId: 'workflow-compiled-1'
    })
  })

  it('throws and does not persist workflow when DSL is invalid', async () => {
    const service = createService()
    const repositoryMock = {
      getDesignDocumentById: vi.fn().mockReturnValue(buildDesignDocument('OFT/1\n[workflow]\n')),
      saveDesignDocument: vi.fn()
    }
    Object.defineProperty(service, 'repository', {
      value: repositoryMock,
      configurable: true
    })

    await expect(
      service.compileDesignDocumentToWorkflow({
        sessionId: 'session-1',
        designDocumentId: 'design-1'
      })
    ).rejects.toThrow(/未通过编译校验/)

    expect(createFromWorkflowMock).not.toHaveBeenCalled()
    expect(repositoryMock.saveDesignDocument).not.toHaveBeenCalled()
  })
})

describe('OrchestflowGenerationEditorService design calibration proposal', () => {
  it('applies a pending design calibration proposal to current document', async () => {
    const service = createService()
    const designDocument = buildDesignDocument('OFT/1\n[workflow]\nname = "old"')
    const savedDesignDocument: GenerationDesignDocument = {
      ...designDocument,
      content: 'OFT/1\n[workflow]\nname = "new"',
      status: 'valid',
      summary: '规划设计稿 DSL 已通过解析与编译校验。',
      diagnosticsJson: null
    }
    const messageMeta: GenerationMessageMetaPayload = {
      designCalibrationBlock: {
        kind: 'design-calibration',
        designDocumentId: designDocument.id,
        status: 'pending',
        totalDiagnosticCount: 2,
        remainingDiagnosticCount: 0,
        currentPass: 2,
        maxPasses: 8,
        phaseLabel: '已生成修复提案，等待审阅',
        canAbort: false,
        summary: 'replace current document',
        truncatedTailDiscarded: false,
        proposal: {
          strategy: 'replace-document',
          summary: 'replace current document',
          baseContentHash: createHash('sha1').update(designDocument.content).digest('hex'),
          targetDiagnosticSignatures: ['a'],
          coveredDiagnosticSignatures: ['a'],
          remainingDiagnosticSignatures: [],
          operations: [],
          replacementDsl: savedDesignDocument.content,
          previewDsl: savedDesignDocument.content,
          truncatedTailDiscarded: false
        },
        errorMessage: null
      }
    }
    const messageRow = {
      id: 'message-1',
      session_id: 'session-1',
      channel_key: 'design-copilot',
      design_document_id: designDocument.id,
      request_id: 'request-1',
      role: 'assistant',
      content: '',
      status: 'final',
      provider_id: 'provider-1',
      model_id: 'model-1',
      error: null,
      usage_json: null,
      meta_json: JSON.stringify(messageMeta),
      raw_response_text: null,
      raw_trace_json: null,
      created_at: '2026-03-14T00:00:00.000Z',
      updated_at: '2026-03-14T00:00:00.000Z'
    }
    const repositoryMock = {
      getMessageById: vi.fn().mockReturnValue(messageRow),
      getDesignDocumentById: vi.fn().mockReturnValue(designDocument),
      saveDesignDocument: vi.fn().mockReturnValue(savedDesignDocument),
      updateMessageMeta: vi.fn()
    }
    Object.defineProperty(service, 'repository', {
      value: repositoryMock,
      configurable: true
    })

    const result = await service.applyDesignCalibrationProposal({
      sessionId: 'session-1',
      messageId: 'message-1'
    })

    expect(repositoryMock.saveDesignDocument).toHaveBeenCalledWith({
      sessionId: 'session-1',
      document: expect.objectContaining({
        id: designDocument.id,
        content: savedDesignDocument.content
      })
    })
    expect(repositoryMock.updateMessageMeta).toHaveBeenCalledTimes(1)
    expect(result.content).toBe(savedDesignDocument.content)
  })

  it('rejects a pending design calibration proposal without mutating document', async () => {
    const service = createService()
    const designDocument = buildDesignDocument('OFT/1\n[workflow]\nname = "old"')
    const messageMeta: GenerationMessageMetaPayload = {
      designCalibrationBlock: {
        kind: 'design-calibration',
        designDocumentId: designDocument.id,
        status: 'pending',
        totalDiagnosticCount: 2,
        remainingDiagnosticCount: 1,
        currentPass: 2,
        maxPasses: 8,
        phaseLabel: '已生成修复提案，等待审阅',
        canAbort: false,
        summary: 'replace current document',
        truncatedTailDiscarded: false,
        proposal: {
          strategy: 'replace-document',
          summary: 'replace current document',
          baseContentHash: createHash('sha1').update(designDocument.content).digest('hex'),
          targetDiagnosticSignatures: ['a'],
          coveredDiagnosticSignatures: [],
          remainingDiagnosticSignatures: ['a'],
          operations: [],
          replacementDsl: 'OFT/1\n[workflow]\nname = "new"',
          previewDsl: 'OFT/1\n[workflow]\nname = "new"',
          truncatedTailDiscarded: false
        },
        errorMessage: null
      }
    }
    const returnedMessage: GenerationMessage = {
      id: 'message-1',
      sessionId: 'session-1',
      channelKey: 'design-copilot',
      designDocumentId: designDocument.id,
      requestId: 'request-1',
      role: 'assistant',
      content: '',
      status: 'final',
      providerId: 'provider-1',
      modelId: 'model-1',
      error: null,
      usageJson: null,
      metaJson: JSON.stringify(messageMeta),
      rawResponseText: null,
      rawTraceJson: null,
      createdAt: '2026-03-14T00:00:00.000Z',
      updatedAt: '2026-03-14T00:00:00.000Z'
    }
    const repositoryMock = {
      getMessageById: vi.fn().mockReturnValue({
        id: returnedMessage.id,
        session_id: returnedMessage.sessionId,
        channel_key: returnedMessage.channelKey,
        design_document_id: returnedMessage.designDocumentId,
        request_id: returnedMessage.requestId,
        role: returnedMessage.role,
        content: returnedMessage.content,
        status: returnedMessage.status,
        provider_id: returnedMessage.providerId,
        model_id: returnedMessage.modelId,
        error: returnedMessage.error,
        usage_json: returnedMessage.usageJson,
        meta_json: returnedMessage.metaJson,
        raw_response_text: returnedMessage.rawResponseText,
        raw_trace_json: returnedMessage.rawTraceJson,
        created_at: returnedMessage.createdAt,
        updated_at: returnedMessage.updatedAt
      }),
      updateMessageMeta: vi.fn(),
      listMessages: vi.fn().mockReturnValue([returnedMessage])
    }
    Object.defineProperty(service, 'repository', {
      value: repositoryMock,
      configurable: true
    })

    const result = await service.rejectDesignCalibrationProposal({
      sessionId: 'session-1',
      messageId: 'message-1'
    })

    expect(repositoryMock.updateMessageMeta).toHaveBeenCalledTimes(1)
    expect(result.id).toBe('message-1')
  })
})
