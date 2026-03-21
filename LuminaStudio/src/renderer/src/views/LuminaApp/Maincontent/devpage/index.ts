import type { Component } from 'vue'
import KnowledgeRetrievalDebugPage from './knowledge-retrieval-debug/index.vue'
import ResponseInspectorPage from './response-inspector/index.vue'
import ServiceHealthPage from './service-health/index.vue'

export type DevPageTabId = 'knowledge-retrieval-debug' | 'service-health' | 'response-inspector'

export interface DevPageTabMeta {
  id: DevPageTabId
  label: string
  description: string
  component: Component
}

export const defaultDevPageTabId: DevPageTabId = 'knowledge-retrieval-debug'

export const devPageTabs: DevPageTabMeta[] = [
  {
    id: 'knowledge-retrieval-debug',
    label: '知识检索调试',
    description: '查看知识库范围、权限树和真实 RAG 结果。',
    component: KnowledgeRetrievalDebugPage
  },
  {
    id: 'service-health',
    label: '服务健康',
    description: '主进程与外部依赖的健康检查占位页。',
    component: ServiceHealthPage
  },
  {
    id: 'response-inspector',
    label: '响应检查',
    description: '响应结构与原始 payload 检查占位页。',
    component: ResponseInspectorPage
  }
]

export function isDevPageTabId(value: unknown): value is DevPageTabId {
  return typeof value === 'string' && devPageTabs.some((tab) => tab.id === value)
}

export function normalizeDevPageTabId(value?: string | null): DevPageTabId {
  if (isDevPageTabId(value)) {
    return value
  }

  return defaultDevPageTabId
}
