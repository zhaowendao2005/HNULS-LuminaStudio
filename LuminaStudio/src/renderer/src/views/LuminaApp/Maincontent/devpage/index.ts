import type { Component } from 'vue'
import KnowledgeRetrievalDebugPage from './knowledge-retrieval-debug/index.vue'
import KGRetrievalDebugPage from './kg-retrieval-debug/index.vue'
import ServiceHealthPage from './service-health/index.vue'

export type DevPageTabId = 'knowledge-retrieval-debug' | 'service-health' | 'kg-retrieval-debug'

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
    id: 'kg-retrieval-debug',
    label: '知识图谱检索',
    description: '执行 KG 检索（local/global/hybrid/naive），调试实体、关系和 chunks 结果。',
    component: KGRetrievalDebugPage
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
