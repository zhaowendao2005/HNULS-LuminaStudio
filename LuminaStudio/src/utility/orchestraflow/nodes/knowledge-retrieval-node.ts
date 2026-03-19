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

      const payload = await this.invokePrivateRpc(KNOWLEDGE_RPC_CHANNEL, {
        query,
        knowledgeBaseId: this.resolveKnowledgeBaseId(nodeData),
        permissionTree: nodeData.permission_tree,
        k: this.normalizePositiveInteger(nodeData.top_k),
        ef: this.normalizeOptionalPositiveInteger(nodeData.ef),
        rerank: this.buildRerankConfig(nodeData)
      })

      const normalized = this.normalizeResponse(payload, query)
      this.persistOutputs(normalized)

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

  private resolveKnowledgeBaseId(nodeData: OFKnowledgeRetrievalNodeData): number {
    const runtimeValue = this.context.inputs.knowledgeBaseId
    if (typeof runtimeValue === 'number' && Number.isInteger(runtimeValue) && runtimeValue > 0) {
      return runtimeValue
    }

    const candidate = (nodeData.permission_tree as { knowledgeBaseId?: unknown } | null | undefined)
      ?.knowledgeBaseId
    if (typeof candidate === 'number' && Number.isInteger(candidate) && candidate > 0) {
      return candidate
    }

    throw new Error('知识检索节点缺少 knowledgeBaseId')
  }

  private buildRerankConfig(
    nodeData: OFKnowledgeRetrievalNodeData
  ): OFPrivateRpcRequestMap['knowledge:retrieve']['rerank'] | undefined {
    if (!nodeData.rerank_enabled) {
      return undefined
    }

    return {
      modelId: nodeData.rerank_model_id,
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
        items
      }
    }
  }

  private persistOutputs(outputs: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(outputs)) {
      this.setOutput(key, value)
    }
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
