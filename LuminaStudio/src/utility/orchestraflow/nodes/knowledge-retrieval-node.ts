import { BaseNode } from './base-node'
import {
  OFBlockEnum,
  type OFKnowledgeRetrievalNodeData,
  type OFPromptItem
} from '@shared/Orchestraflow-types'
import type { ExecutionContext, NodeResult } from './types'
import { VariableStore } from '../services/variable-store'
import type {
  OFPrivateRpcChannel,
  OFPrivateRpcRequestMap,
  OFPrivateRpcResponseMap
} from '../messages.types'
import type { KnowledgeRetrievalSearchResultDto } from '@main/services/knowledge-retrieval'

// 知识检索节点固定走 knowledge:retrieve 私有 RPC 通道。
const KNOWLEDGE_RPC_CHANNEL: OFPrivateRpcChannel = 'knowledge:retrieve'

interface PrivateRpcPortLike {
  postMessage: (message: unknown) => void
  on: (event: 'message', listener: (event: { data: unknown } | unknown) => void) => void
  off?: (event: 'message', listener: (event: { data: unknown } | unknown) => void) => void
  removeListener?: (
    event: 'message',
    listener: (event: { data: unknown } | unknown) => void
  ) => void
}

function toSerializableValue<T>(value: T): T {
  if (value === undefined) {
    return value
  }
  const seen = new WeakSet<object>()
  return JSON.parse(
    JSON.stringify(value, (_key, currentValue) => {
      if (typeof currentValue === 'bigint') {
        return currentValue.toString()
      }
      if (typeof currentValue === 'function' || typeof currentValue === 'symbol') {
        return undefined
      }
      if (currentValue instanceof Error) {
        return {
          name: currentValue.name,
          message: currentValue.message,
          stack: currentValue.stack
        }
      }
      if (currentValue && typeof currentValue === 'object') {
        if (seen.has(currentValue)) {
          return '[Circular]'
        }
        seen.add(currentValue)
      }
      return currentValue
    })
  ) as T
}

export class KnowledgeRetrievalNode extends BaseNode {
  readonly nodeType: OFBlockEnum.KnowledgeRetrieval

  constructor(node: any, variableStore: VariableStore) {
    super(node, variableStore)
    this.nodeType = OFBlockEnum.KnowledgeRetrieval
  }

  async execute(context: ExecutionContext): Promise<NodeResult> {
    this.setContext(context)

    const nodeData = this.getNodeData() as OFKnowledgeRetrievalNodeData
    const query = this.resolveQuery(nodeData)
    const outputs: Record<string, unknown> = {
      query,
      total_scopes: 0,
      total_hits: 0,
      partial_failure: false,
      items: [],
      result: ''
    }

    try {
      if (!query) {
        throw new Error('知识检索节点缺少 query 输入')
      }

      const knowledgeSelection = this.resolveKnowledgeSelection(nodeData)
      const payload = await this.invokePrivateRpc(KNOWLEDGE_RPC_CHANNEL, {
        query,
        knowledgeBaseId: knowledgeSelection.knowledgeBaseIds[0],
        knowledgeBaseIds: knowledgeSelection.knowledgeBaseIds,
        selectedKnowledgeBaseIds: knowledgeSelection.selectedKnowledgeBaseIds,
        selectedDocumentFileKeysByKnowledgeBase:
          knowledgeSelection.selectedDocumentFileKeysByKnowledgeBase,
        k: this.normalizePositiveInteger(nodeData.top_k),
        ef: this.normalizeOptionalPositiveInteger(nodeData.ef),
        rerank: this.buildRerankConfig(nodeData)
      })

      const normalized = this.normalizeResponse(payload as KnowledgeRetrievalSearchResultDto, query)
      this.persistOutputs(normalized, nodeData)

      return {
        outputs: normalized
      }
    } catch (error) {
      return {
        outputs,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private resolveQuery(nodeData: OFKnowledgeRetrievalNodeData): string {
    const runtimeQuery = this.context.inputs.query
    if (typeof runtimeQuery === 'string' && runtimeQuery.trim()) {
      return runtimeQuery.trim()
    }

    return this.renderPromptItems(nodeData.query_template)
  }

  private renderPromptItems(items?: OFPromptItem[]): string {
    if (!Array.isArray(items) || items.length === 0) {
      return ''
    }

    return items
      .map((item) => this.replaceVariables(String(item.text || '')))
      .join('\n')
      .trim()
  }

  private replaceVariables(text: string): string {
    return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, variablePath) => {
      const value = this.variableStore.getByPath(variablePath)
      if (value === undefined) {
        return match
      }
      if (typeof value === 'string') {
        return value
      }
      try {
        return JSON.stringify(value)
      } catch {
        return String(value)
      }
    })
  }

  private resolveKnowledgeSelection(nodeData: OFKnowledgeRetrievalNodeData): {
    knowledgeBaseIds: number[]
    selectedKnowledgeBaseIds: number[]
    selectedDocumentFileKeysByKnowledgeBase: Record<number, string[]>
  } {
    const knowledgeBaseIds = this.normalizeKnowledgeBaseIds(nodeData.knowledge_base_ids)
    const selectedKnowledgeBaseIds = this.normalizeKnowledgeBaseIds(
      nodeData.selected_knowledge_base_ids
    )
    const selectedDocumentFileKeysByKnowledgeBase = this.normalizeDocumentSelection(
      nodeData.selected_document_file_keys_by_knowledge_base
    )

    const mergedKnowledgeBaseIds = new Set<number>(knowledgeBaseIds)
    const mergedSelectedKnowledgeBaseIds = new Set<number>(selectedKnowledgeBaseIds)

    for (const key of Object.keys(selectedDocumentFileKeysByKnowledgeBase)) {
      const knowledgeBaseId = Number(key)
      if (Number.isInteger(knowledgeBaseId) && knowledgeBaseId > 0) {
        mergedKnowledgeBaseIds.add(knowledgeBaseId)
        mergedSelectedKnowledgeBaseIds.add(knowledgeBaseId)
      }
    }

    const result = [...mergedKnowledgeBaseIds]
    if (result.length === 0) {
      throw new Error('知识检索节点缺少显式知识库选择')
    }

    return {
      knowledgeBaseIds: result,
      selectedKnowledgeBaseIds: [...mergedSelectedKnowledgeBaseIds].sort(
        (left, right) => left - right
      ),
      selectedDocumentFileKeysByKnowledgeBase
    }
  }

  private normalizeKnowledgeBaseIds(value: unknown): number[] {
    if (!Array.isArray(value)) {
      return []
    }

    const knowledgeBaseIds = new Set<number>()
    for (const item of value) {
      if (typeof item === 'number' && Number.isInteger(item) && item > 0) {
        knowledgeBaseIds.add(item)
      }
    }

    return [...knowledgeBaseIds].sort((left, right) => left - right)
  }

  private normalizeDocumentSelection(value: unknown): Record<number, string[]> {
    if (!value || typeof value !== 'object') {
      return {}
    }

    const result: Record<number, string[]> = {}
    for (const [key, rawFileKeys] of Object.entries(value as Record<string, unknown>)) {
      const knowledgeBaseId = Number(key)
      if (!Number.isInteger(knowledgeBaseId) || knowledgeBaseId <= 0) {
        continue
      }

      const fileKeys = Array.isArray(rawFileKeys)
        ? rawFileKeys
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.trim())
            .filter(Boolean)
        : []
      if (fileKeys.length === 0) {
        continue
      }

      result[knowledgeBaseId] = [...new Set(fileKeys)].sort()
    }

    return result
  }

  private buildRerankConfig(
    nodeData: OFKnowledgeRetrievalNodeData
  ): OFPrivateRpcRequestMap['knowledge:retrieve']['rerank'] | undefined {
    if (!nodeData.rerank_enabled) {
      return undefined
    }

    return {
      modelId:
        typeof nodeData.rerank_model_id === 'string' && nodeData.rerank_model_id.trim()
          ? nodeData.rerank_model_id.trim()
          : null,
      // 中文注释：topN 允许小于 top_k，语义是“先召回更多候选，再仅保留重排后的前 N 条”。
      topN: this.normalizeOptionalPositiveInteger(nodeData.rerank_top_n)
    }
  }

  private normalizeResponse(
    payload: KnowledgeRetrievalSearchResultDto,
    fallbackQuery: string
  ): Record<string, unknown> {
    const items = Array.isArray(payload?.hits) ? payload.hits : []
    const totalScopes = Array.isArray(payload?.resolvedScopes) ? payload.resolvedScopes.length : 0
    const totalHits = items.length
    const partialFailure = Array.isArray(payload?.errors) && payload.errors.length > 0
    // 中文注释：这里必须把 result.items 做成独立副本，不能复用同一个数组引用。
    // 否则主进程在做可序列化转换时，会把重复引用标成 [Circular]，调试面板看起来就像“只剩半截结果”。
    const resultItems = items.map((item) => toSerializableValue(item))

    return {
      query: payload?.query ?? fallbackQuery,
      total_scopes: totalScopes,
      total_hits: totalHits,
      partial_failure: partialFailure,
      items,
      result: {
        query: payload?.query ?? fallbackQuery,
        total_scopes: totalScopes,
        total_hits: totalHits,
        partial_failure: partialFailure,
        items: resultItems
      }
    }
  }

  private persistOutputs(
    outputs: Record<string, unknown>,
    nodeData: OFKnowledgeRetrievalNodeData
  ): void {
    const namespace = this.resolveOutputNamespace(nodeData)

    // 中文注释：先把整包结果挂到命名空间根节点，保证 `namespace.query` 这种 selector 可直接读到。
    // 同时再补一份扁平字段，兼容旧工作流里还在用的 `query / total_hits` 直接引用方式。
    this.setOutput(namespace, outputs)
    for (const [key, value] of Object.entries(outputs)) {
      this.setOutput(key, value)
    }
  }

  private resolveOutputNamespace(nodeData: OFKnowledgeRetrievalNodeData): string {
    const rawNamespace =
      typeof nodeData.output_namespace === 'string' && nodeData.output_namespace.trim()
        ? nodeData.output_namespace.trim()
        : ''
    return rawNamespace || 'knowledge_retrieval'
  }

  private normalizePositiveInteger(value: unknown): number | undefined {
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
      return undefined
    }
    return value
  }

  private normalizeOptionalPositiveInteger(value: unknown): number | undefined {
    return this.normalizePositiveInteger(value)
  }

  private async invokePrivateRpc<TChannel extends OFPrivateRpcChannel>(
    channel: TChannel,
    payload: OFPrivateRpcRequestMap[TChannel]
  ): Promise<OFPrivateRpcResponseMap[TChannel]> {
    const port = this.getPrivateRpcPort()
    const requestId = `${channel}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`

    return await new Promise<OFPrivateRpcResponseMap[TChannel]>((resolve, reject) => {
      const handleMessage = (event: { data: unknown } | unknown) => {
        const rawMessage =
          event && typeof event === 'object' && 'data' in event
            ? (event as { data: unknown }).data
            : event

        if (!this.isRpcResponseForRequest(rawMessage, requestId, channel)) {
          return
        }

        cleanup()

        const message = rawMessage as
          | {
              type: 'private-rpc:response'
              requestId: string
              channel: TChannel
              success: true
              payload: OFPrivateRpcResponseMap[TChannel]
            }
          | {
              type: 'private-rpc:response'
              requestId: string
              channel: TChannel
              success: false
              error: string
            }

        if (message.success) {
          resolve(message.payload)
          return
        }

        reject(new Error(message.error || `${channel} RPC 调用失败`))
      }

      const cleanup = () => {
        if (typeof port.off === 'function') {
          port.off('message', handleMessage)
          return
        }
        if (typeof port.removeListener === 'function') {
          port.removeListener('message', handleMessage)
        }
      }

      port.on('message', handleMessage)
      port.postMessage({
        type: 'private-rpc:request',
        requestId,
        channel,
        payload
      })
    })
  }

  private isRpcResponseForRequest(
    message: unknown,
    requestId: string,
    channel: OFPrivateRpcChannel
  ): boolean {
    if (!message || typeof message !== 'object') {
      return false
    }

    const candidate = message as { type?: string; requestId?: string; channel?: string }
    return (
      candidate.type === 'private-rpc:response' &&
      candidate.requestId === requestId &&
      candidate.channel === channel
    )
  }

  private getPrivateRpcPort(): PrivateRpcPortLike {
    const port = process.parentPort as PrivateRpcPortLike | undefined
    if (!port) {
      throw new Error('当前运行环境未提供 private RPC 通道')
    }
    return port
  }
}
