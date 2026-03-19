import { BaseNode } from './base-node'
import {
  OFBlockEnum,
  type OFPaperRetrievalNodeData,
  type OFPromptItem
} from '@shared/Orchestraflow-types'
import type { ExecutionContext, NodeResult } from './types'
import { VariableStore } from '../services/variable-store'
import type {
  OFPrivateRpcChannel,
  OFPrivateRpcRequestMap,
  OFPrivateRpcResponseMap
} from '../messages.types'
import type { PaperRetrievalSearchResult } from '@preload/types'

// 论文检索节点固定走 paper:retrieve 私有 RPC 通道。
const PAPER_RPC_CHANNEL: OFPrivateRpcChannel = 'paper:retrieve'

interface PrivateRpcPortLike {
  postMessage: (message: unknown) => void
  on: (event: 'message', listener: (event: { data: unknown } | unknown) => void) => void
  off?: (event: 'message', listener: (event: { data: unknown } | unknown) => void) => void
  removeListener?: (
    event: 'message',
    listener: (event: { data: unknown } | unknown) => void
  ) => void
}

export class PaperRetrievalNode extends BaseNode {
  readonly nodeType: OFBlockEnum.PaperRetrieval

  constructor(node: any, variableStore: VariableStore) {
    super(node, variableStore)
    this.nodeType = OFBlockEnum.PaperRetrieval
  }

  async execute(context: ExecutionContext): Promise<NodeResult> {
    this.setContext(context)

    const nodeData = this.getNodeData() as OFPaperRetrievalNodeData
    const query = this.resolveQuery(nodeData)
    const outputs: Record<string, unknown> = {
      query,
      provider: nodeData.provider_id,
      total_found: 0,
      returned_count: 0,
      items: [],
      latency_ms: 0,
      result: ''
    }

    try {
      if (!query) {
        throw new Error('论文检索节点缺少 query 输入')
      }

      const payload = await this.invokePrivateRpc(PAPER_RPC_CHANNEL, {
        provider_id: nodeData.provider_id,
        api_key_ref_id: nodeData.api_key_ref_id,
        provider_options: {
          ...nodeData.provider_options,
          query,
          limit: nodeData.top_k,
          sort: this.normalizeSort(nodeData.sort_by),
          start_date: nodeData.date_from,
          end_date: nodeData.date_to
        }
      })

      const normalized = this.normalizeResponse(payload, { query, provider: nodeData.provider_id })
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

  private resolveQuery(nodeData: OFPaperRetrievalNodeData): string {
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

  private normalizeSort(sortBy: OFPaperRetrievalNodeData['sort_by']): 'relevance' | 'pub_date' {
    if (sortBy === 'date_desc' || sortBy === 'date_asc') {
      return 'pub_date'
    }
    return 'relevance'
  }

  private normalizeResponse(
    payload: PaperRetrievalSearchResult,
    fallback: { query: string; provider: string }
  ): Record<string, unknown> {
    const items = Array.isArray(payload?.items) ? payload.items : []
    const totalFound =
      typeof payload?.total_found === 'number' && Number.isFinite(payload.total_found)
        ? payload.total_found
        : items.length
    const returnedCount = items.length
    const latencyMs =
      typeof payload?.meta?.latency_ms === 'number' && Number.isFinite(payload.meta.latency_ms)
        ? payload.meta.latency_ms
        : 0

    return {
      query: payload?.query ?? fallback.query,
      provider: payload?.provider_id ?? fallback.provider,
      total_found: totalFound,
      returned_count: returnedCount,
      items,
      latency_ms: latencyMs,
      result: {
        query: payload?.query ?? fallback.query,
        provider: payload?.provider_id ?? fallback.provider,
        total_found: totalFound,
        returned_count: returnedCount,
        items,
        latency_ms: latencyMs
      }
    }
  }

  private persistOutputs(outputs: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(outputs)) {
      this.setOutput(key, value)
    }
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
