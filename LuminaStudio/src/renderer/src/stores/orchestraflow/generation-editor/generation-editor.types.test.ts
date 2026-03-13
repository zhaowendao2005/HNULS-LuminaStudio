import { describe, expect, it } from 'vitest'
import { buildOFPlanningMarkdown, createEmptyOFPlanningDocument } from '@shared/Orchestraflow-types'
import {
  buildPlanningDiffRows,
  buildPlanningReviewState,
  getGenerationDesignBlueprintBlock,
  getGenerationPlanningBlock,
  getLatestGenerationPlanningReviewEntry,
  parsePlanningMarkdownSections
} from './generation-editor.types'
import type { GenerationMessage, GenerationPlanningDocument } from '@preload/types'

function buildPlanningDocument(id = 'doc-1'): GenerationPlanningDocument {
  const document = createEmptyOFPlanningDocument()
  document.sections['analysis-summary'] = '- 当前摘要'
  const content = buildOFPlanningMarkdown(document)
  return {
    id,
    sessionId: 'session-1',
    stageKey: 'analysis',
    sourceMessageId: 'message-source',
    title: 'analysis planning',
    sourceMarkdown: content,
    content,
    sections: document.sections,
    createdAt: '2026-03-13T00:00:00.000Z',
    updatedAt: '2026-03-13T00:00:00.000Z'
  }
}

function buildCopilotMessage(params: {
  id: string
  documentId: string
  status: 'pending' | 'applied' | 'rejected' | 'failed' | 'noop'
  commandDsl?: string
  commands?: unknown[]
  errorMessage?: string | null
}): GenerationMessage {
  return {
    id: params.id,
    sessionId: 'session-1',
    channelKey: 'analysis-copilot',
    designDocumentId: null,
    requestId: 'request-1',
    role: 'assistant',
    content: '这里是 copilot 的自然语言说明。',
    status: 'final',
    providerId: 'provider-1',
    modelId: 'model-1',
    error: null,
    usageJson: null,
    metaJson: JSON.stringify({
      mode: 'continue',
      copilotEditBlock: {
        kind: 'planning-edit',
        documentId: params.documentId,
        mode: params.status === 'noop' ? 'noop' : 'propose',
        commandDsl:
          params.commandDsl ||
          `<LUMINA_PLANNING_COMMANDS>
DOC ${params.documentId}
MODE PROPOSE
REPLACE_SECTION analysis-summary
<CONTENT>
- 待审阅的新摘要
</CONTENT>
</LUMINA_PLANNING_COMMANDS>`,
        commands: params.commands || [
          {
            type: 'replace-section',
            sectionKey: 'analysis-summary',
            content: '- 待审阅的新摘要'
          }
        ],
        status: params.status,
        affectedSectionKeys: ['analysis-summary'],
        errorMessage: params.errorMessage || null
      }
    }),
    rawResponseText: null,
    rawTraceJson: null,
    createdAt: '2026-03-13T00:00:00.000Z',
    updatedAt: '2026-03-13T00:00:00.000Z'
  }
}

describe('generation-editor.types', () => {
  it('does not expose planning block when meta mode is continue', () => {
    const block = getGenerationPlanningBlock({
      metaJson: JSON.stringify({
        vendor: 'openai',
        protocol: 'openai-response',
        agentId: 'analysis-planner-agent',
        mode: 'continue',
        planningBlock: {
          kind: 'analysis-planning',
          version: '2.0',
          agentId: 'analysis-planner-agent',
          trigger: 'auto',
          status: 'draft',
          analysisMarkdown: '# 需求分析\n## 摘要\n- 继续澄清',
          designMarkdown: '# 设计交接\n## 节点声明\n- 暂无'
        }
      })
    })

    expect(block).toBeNull()
  })

  it('exposes planning block when meta mode is planning', () => {
    const block = getGenerationPlanningBlock({
      metaJson: JSON.stringify({
        vendor: 'openai',
        protocol: 'openai-response',
        agentId: 'analysis-planner-agent',
        mode: 'planning',
        planningBlock: {
          kind: 'analysis-planning',
          version: '2.0',
          agentId: 'analysis-planner-agent',
          trigger: 'explicit',
          status: 'ready',
          analysisMarkdown: '# 需求分析\n## 摘要\n- 已可规划',
          designMarkdown: '# 设计交接\n## 节点声明\n- start：接收输入'
        }
      })
    })

    expect(block?.status).toBe('ready')
    expect(block?.trigger).toBe('explicit')
  })

  it('parses markdown subsection bodies under fixed titles', () => {
    const sections = parsePlanningMarkdownSections(`# 需求分析
## 摘要
- 第一条
- 第二条

## 目标
- 目标一
`)

    expect(sections['摘要']?.content).toContain('第一条')
    expect(sections['摘要']?.content).toContain('第二条')
    expect(sections['目标']?.content).toContain('目标一')
  })

  it('picks the latest review block for the active planning document', () => {
    const messages = [
      buildCopilotMessage({ id: 'message-1', documentId: 'doc-1', status: 'pending' }),
      buildCopilotMessage({ id: 'message-2', documentId: 'doc-2', status: 'pending' }),
      buildCopilotMessage({ id: 'message-3', documentId: 'doc-1', status: 'failed' })
    ]

    const reviewEntry = getLatestGenerationPlanningReviewEntry(messages, 'doc-1')

    expect(reviewEntry?.messageId).toBe('message-3')
    expect(reviewEntry?.block.status).toBe('failed')
  })

  it('builds a proposed draft and review diff when there is a pending copilot edit', () => {
    const document = buildPlanningDocument('doc-1')
    const reviewState = buildPlanningReviewState({
      document,
      messages: [buildCopilotMessage({ id: 'message-1', documentId: 'doc-1', status: 'pending' })]
    })

    expect(reviewState.isPendingReview).toBe(true)
    expect(reviewState.isSourceEditable).toBe(false)
    expect(reviewState.displayDocument.content).toContain('待审阅的新摘要')
    expect(reviewState.diffSourceMarkdown).toBe(document.content)
    expect(reviewState.diffCurrentMarkdown).toContain('待审阅的新摘要')
  })

  it('keeps current document and exposes error when latest review failed', () => {
    const document = buildPlanningDocument('doc-1')
    const reviewState = buildPlanningReviewState({
      document,
      messages: [
        buildCopilotMessage({
          id: 'message-1',
          documentId: 'doc-1',
          status: 'failed',
          errorMessage: '命令格式不合法'
        })
      ]
    })

    expect(reviewState.isPendingReview).toBe(false)
    expect(reviewState.isSourceEditable).toBe(true)
    expect(reviewState.displayDocument.content).toBe(document.content)
    expect(reviewState.reviewErrorMessage).toContain('命令格式不合法')
  })

  it('builds red-green comparable diff rows for changed lines', () => {
    const rows = buildPlanningDiffRows({
      sourceMarkdown: '# 需求分析\n## 摘要\n- 旧摘要',
      currentMarkdown: '# 需求分析\n## 摘要\n- 新摘要'
    })

    expect(rows[0]).toMatchObject({
      beforeType: 'unchanged',
      afterType: 'unchanged'
    })
    expect(rows[2]).toMatchObject({
      beforeText: '- 旧摘要',
      afterText: '- 新摘要',
      beforeType: 'removed',
      afterType: 'added'
    })
  })

  it('parses design blueprint generation block from message meta', () => {
    const block = getGenerationDesignBlueprintBlock({
      metaJson: JSON.stringify({
        designBlueprintBlock: {
          kind: 'design-blueprint-generation',
          designDocumentId: 'design-doc-1',
          generationMode: 'generate',
          status: 'invalid',
          diagnostics: [
            {
              code: 'invalid-inline-value',
              severity: 'error',
              path: 'workflow.name',
              message: 'workflow.name 缺失',
              line: 2,
              column: 1,
              endLine: 2,
              endColumn: 20
            }
          ],
          errorMessage: 'invalid-inline-value: workflow.name 缺失'
        }
      })
    })

    expect(block?.designDocumentId).toBe('design-doc-1')
    expect(block?.status).toBe('invalid')
    expect(block?.diagnostics?.[0]?.code).toBe('invalid-inline-value')
  })
})
