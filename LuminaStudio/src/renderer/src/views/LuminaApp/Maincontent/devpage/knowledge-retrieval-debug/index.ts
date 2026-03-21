import type {
  KnowledgeDebugDocumentState,
  KnowledgeDebugDocumentStatusFilter
} from '@renderer/stores/knowledge-debug/types'

export const knowledgeDebugDocumentStatusOptions: Array<{
  label: string
  value: KnowledgeDebugDocumentStatusFilter
}> = [
  { label: '全部', value: 'all' },
  { label: 'completed', value: 'completed' },
  { label: 'partial', value: 'partial' },
  { label: 'pending', value: 'pending' },
  { label: 'failed', value: 'failed' },
  { label: 'empty', value: 'empty' }
]

export const knowledgeDebugResultSortOptions: Array<{
  label: string
  value: 'distance' | 'rerankScore' | 'chunkIndex'
}> = [
  { label: '按 distance', value: 'distance' },
  { label: '按 rerankScore', value: 'rerankScore' },
  { label: '按 chunkIndex', value: 'chunkIndex' }
]

export const knowledgeDebugDocumentStateLabelMap: Record<KnowledgeDebugDocumentState, string> = {
  completed: '已完成',
  partial: '部分完成',
  pending: '处理中',
  failed: '失败',
  empty: '空白'
}

export const knowledgeDebugDocumentStateClassMap: Record<KnowledgeDebugDocumentState, string> = {
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  partial: 'border-amber-200 bg-amber-50 text-amber-700',
  pending: 'border-sky-200 bg-sky-50 text-sky-700',
  failed: 'border-rose-200 bg-rose-50 text-rose-700',
  empty: 'border-slate-200 bg-slate-100 text-slate-600'
}
