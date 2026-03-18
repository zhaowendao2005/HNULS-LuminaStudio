<template>
  <div class="of-panel-shell of-knowledge-retrieval-node-panel" :class="theme.panelClass">
    <div class="of-panel-shell-header">
      <div class="of-panel-shell-title-row">
        <div class="of-panel-shell-icon" :class="theme.iconBgClass">
          <svg
            viewBox="0 0 24 24"
            class="h-4 w-4"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M10.5 18a7.5 7.5 0 1 1 5.303-2.197L21 21"
            />
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 10h5M8 13h3" />
          </svg>
        </div>

        <input
          v-model="titleModel"
          class="system-xl-semibold of-panel-shell-title-input"
          placeholder="添加标题..."
        />

        <div class="of-panel-shell-actions">
          <button
            class="of-panel-icon-button flex h-6 w-6 items-center justify-center rounded-md"
            @click="handleClose"
          >
            <svg viewBox="0 0 24 24" class="of-panel-icon-svg h-4 w-4" fill="currentColor">
              <path
                d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.04996 5.63672L11.9997 10.5865Z"
              />
            </svg>
          </button>
        </div>
      </div>

      <div class="of-panel-shell-description">
        <textarea
          v-model="descModel"
          class="of-panel-shell-description-input"
          placeholder="添加描述..."
          :style="{ height: '18px' }"
        />
      </div>
    </div>

    <div class="of-panel-shell-body">
      <div class="of-panel-shell-body-inner">
        <section class="of-panel-section of-panel-container-section">
          <div class="of-doc-title-strong">基础信息</div>
          <div class="mt-2 space-y-2 text-xs leading-5 text-gray-500">
            <div>该节点会根据查询模板和权限树配置，执行知识库检索并输出标准化命中结果。</div>
            <div class="flex flex-wrap gap-1.5">
              <span
                class="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-700"
              >
                {{ knowledgeBaseBadge }}
              </span>
              <span
                class="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700"
              >
                TOP {{ topKModel }}
              </span>
              <span
                class="rounded-md border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-medium text-cyan-700"
              >
                {{ efSummary }}
              </span>
              <span
                class="rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700"
              >
                {{ rerankSummary }}
              </span>
            </div>
          </div>
        </section>

        <section class="of-panel-section of-panel-container-section">
          <div class="flex items-center justify-between gap-3">
            <div class="of-doc-title-strong">查询模板</div>
            <button class="of-state-inline-action" @click="addPrompt">添加消息</button>
          </div>

          <div v-if="promptItems.length === 0" class="of-state-empty mt-2">
            暂无查询模板，至少添加一条消息来描述检索问题。
          </div>

          <div
            v-for="item in promptItems"
            :key="item.id"
            class="mt-2 rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-3"
          >
            <div class="mb-2 flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5">
                <button
                  v-for="option in promptRoleOptions"
                  :key="option.value"
                  type="button"
                  class="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase transition"
                  :class="item.role === option.value ? option.activeClass : 'text-gray-400'"
                  @click="updatePromptRole(item.id, option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
              <button
                class="of-declare-action of-declare-action-danger"
                @click="removePrompt(item.id)"
              >
                删除
              </button>
            </div>

            <PromptTextarea
              :model-value="item.text"
              :height="88"
              placeholder="输入检索提示词，例如问题、关键词、过滤条件..."
              @update:model-value="updatePrompt(item.id, { text: $event })"
            />
          </div>
        </section>

        <section class="of-panel-section of-panel-container-section">
          <div class="of-doc-title-strong">检索参数</div>
          <div class="mt-3 grid grid-cols-3 gap-2">
            <div class="of-panel-field-stack">
              <div class="system-sm-semibold-uppercase text-gray-700">知识库 ID</div>
              <input
                v-model.number="knowledgeBaseIdModel"
                type="number"
                min="1"
                class="of-panel-input h-10"
                placeholder="运行时可覆盖"
              />
            </div>
            <div class="of-panel-field-stack">
              <div class="system-sm-semibold-uppercase text-gray-700">返回条数</div>
              <input
                v-model.number="topKModel"
                type="number"
                min="1"
                max="20"
                class="of-panel-input h-10"
              />
            </div>
            <div class="of-panel-field-stack">
              <div class="system-sm-semibold-uppercase text-gray-700">EF</div>
              <input
                v-model.number="efModel"
                type="number"
                min="1"
                class="of-panel-input h-10"
                placeholder="留空为自动"
              />
            </div>
          </div>
          <div class="mt-2 text-xs leading-5 text-gray-500">
            若这里留空，运行时也可以从上游输入
            `knowledgeBaseId`；当前默认策略会放开该知识库下的全部文档。
          </div>

          <div class="mt-3 rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-3">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-[13px] font-semibold leading-[18px] text-gray-800">重排设置</div>
                <div class="mt-1 text-xs text-gray-500">可选启用 rerank，并限制返回前 N 条。</div>
              </div>
              <button
                type="button"
                class="inline-flex h-8 max-w-full items-center overflow-hidden rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm"
              >
                <span
                  class="min-w-[54px] rounded-[5px] px-2 text-center text-xs font-semibold leading-7 transition"
                  :class="
                    rerankEnabledModel ? 'bg-green-50 text-green-700 shadow-sm' : 'text-gray-400'
                  "
                  @click="rerankEnabledModel = true"
                >
                  ON
                </span>
                <span
                  class="min-w-[54px] rounded-[5px] px-2 text-center text-xs font-semibold leading-7 transition"
                  :class="
                    !rerankEnabledModel ? 'bg-rose-50 text-rose-700 shadow-sm' : 'text-gray-400'
                  "
                  @click="rerankEnabledModel = false"
                >
                  OFF
                </span>
              </button>
            </div>

            <div class="mt-3 grid grid-cols-2 gap-2">
              <div class="of-panel-field-stack">
                <div class="system-sm-semibold-uppercase text-gray-700">重排模型 ID</div>
                <input
                  v-model="rerankModelIdModel"
                  type="text"
                  class="of-panel-input h-10"
                  placeholder="可为空"
                />
              </div>
              <div class="of-panel-field-stack">
                <div class="system-sm-semibold-uppercase text-gray-700">重排 TopN</div>
                <input
                  v-model.number="rerankTopNModel"
                  type="number"
                  min="1"
                  class="of-panel-input h-10"
                  placeholder="可为空"
                />
              </div>
            </div>
          </div>
        </section>

        <section class="of-panel-section of-panel-container-section">
          <div class="of-doc-title-strong">权限树概览</div>
          <div class="mt-2 text-xs leading-5 text-gray-500">
            当前面板先支持知识库级全量放行；后续如果要做更细粒度文件 / embedding
            选择，再补可视化选择器。
          </div>
          <div
            class="mt-3 rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-3 text-xs text-gray-600"
          >
            <div>根节点数量：{{ providerCount }}</div>
            <div class="mt-2">当前策略：{{ permissionSummary }}</div>
          </div>
        </section>

        <section class="of-panel-section of-panel-container-section">
          <div class="of-doc-title-strong">输出说明</div>
          <div class="mt-3 rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-3">
            <div class="text-xs leading-5 text-gray-500">
              该节点会输出 query、total_scopes、total_hits、partial_failure、items 与完整 result。
            </div>
            <div class="mt-3 space-y-2">
              <div
                v-for="item in outputPreviewItems"
                :key="item.name"
                class="flex items-center justify-between gap-3 rounded-lg bg-white/80 px-3 py-2"
              >
                <div class="text-[13px] font-semibold leading-[18px] text-gray-800">
                  {{ item.name }}
                </div>
                <div class="text-xs text-gray-500">{{ item.type }}</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OFKnowledgeRetrievalNodeData, OFPromptItem } from '@shared/Orchestraflow-types'
import { useWorkflowEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor.store'
import { useWorkflowEditorUIStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor-ui.store'
import { OF_PANEL_THEME } from '../panel-theme'
import PromptTextarea from '../PromptTextarea/index.vue'

const uiStore = useWorkflowEditorUIStore()
const editorStore = useWorkflowEditorStore()
const theme = OF_PANEL_THEME.knowledgeRetrieval

const promptRoleOptions = [
  { label: 'SYSTEM', value: 'system', activeClass: 'bg-blue-50 text-blue-700' },
  { label: 'USER', value: 'user', activeClass: 'bg-cyan-50 text-cyan-700' },
  { label: 'ASSISTANT', value: 'assistant', activeClass: 'bg-violet-50 text-violet-700' }
] as const

const currentNode = computed(() => {
  if (!uiStore.selectedNodeId) return null
  return editorStore.findNodeById(uiStore.selectedNodeId) || null
})

const nodeData = computed(() => currentNode.value?.data as OFKnowledgeRetrievalNodeData | undefined)
const promptItems = computed(() => nodeData.value?.query_template || [])
const knowledgeBaseIdModel = computed({
  get: () => {
    const value = nodeData.value?.permission_tree?.knowledgeBaseId
    return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : ''
  },
  set: (value: number | '') => {
    const normalized = value === '' ? null : Math.max(1, Math.floor(Number(value || 1)))
    patchNode({
      permission_tree: {
        providers: nodeData.value?.permission_tree?.providers || [],
        effect: nodeData.value?.permission_tree?.effect || 'allow',
        documents: nodeData.value?.permission_tree?.documents,
        knowledgeBaseId: normalized
      }
    })
  }
})

const titleModel = computed({
  get: () => nodeData.value?.title || '知识检索',
  set: (value: string) => patchNode({ title: value })
})

const descModel = computed({
  get: () => nodeData.value?.desc || '',
  set: (value: string) => patchNode({ desc: value })
})

const topKModel = computed({
  get: () => Math.max(1, Math.min(20, Number(nodeData.value?.top_k || 5))),
  set: (value: number) => {
    const normalized = Math.max(1, Math.min(20, Number(value || 5)))
    patchNode({ top_k: normalized })
  }
})

const efModel = computed({
  get: () => (nodeData.value?.ef ?? '') as number | '',
  set: (value: number | '') => {
    const normalized = value === '' ? null : Math.max(1, Number(value || 1))
    patchNode({ ef: normalized })
  }
})

const rerankEnabledModel = computed({
  get: () => Boolean(nodeData.value?.rerank_enabled),
  set: (value: boolean) => patchNode({ rerank_enabled: value })
})

const rerankModelIdModel = computed({
  get: () => nodeData.value?.rerank_model_id || '',
  set: (value: string) => patchNode({ rerank_model_id: value || null })
})

const rerankTopNModel = computed({
  get: () => (nodeData.value?.rerank_top_n ?? '') as number | '',
  set: (value: number | '') => {
    const normalized = value === '' ? null : Math.max(1, Number(value || 1))
    patchNode({ rerank_top_n: normalized })
  }
})

const providerCount = computed(() => nodeData.value?.permission_tree?.providers?.length || 0)
const knowledgeBaseBadge = computed(() => {
  const knowledgeBaseId = nodeData.value?.permission_tree?.knowledgeBaseId
  return typeof knowledgeBaseId === 'number' && knowledgeBaseId > 0
    ? `KB ${knowledgeBaseId}`
    : '未指定知识库'
})

const efSummary = computed(() => {
  return nodeData.value?.ef ? `EF ${nodeData.value.ef}` : 'EF 自动'
})

const rerankSummary = computed(() => {
  if (!nodeData.value?.rerank_enabled) return '未启用重排'
  return `重排 TOP ${nodeData.value.rerank_top_n || '自动'}`
})

const permissionSummary = computed(() => {
  if (nodeData.value?.permission_tree?.documents?.length) {
    return `已限定 ${nodeData.value.permission_tree.documents.length} 条文档规则`
  }
  if (typeof nodeData.value?.permission_tree?.knowledgeBaseId === 'number') {
    return '知识库级全量放行'
  }
  return '尚未指定知识库'
})

const outputPreviewItems = computed(() => {
  const variables = nodeData.value?.output?.variables || []
  return variables.map((item) => ({
    name: item.variable,
    type: String(item.type || 'string')
  }))
})

function handleClose() {
  uiStore.closeNodeConfigPanel()
}

function patchNode(patch: Partial<OFKnowledgeRetrievalNodeData>) {
  if (!currentNode.value) return
  editorStore.updateNode(currentNode.value.id, patch)
}

function updatePrompt(promptId: string, patch: Partial<Omit<OFPromptItem, 'id'>>) {
  const next = promptItems.value.map((item) =>
    item.id === promptId ? { ...item, ...patch } : item
  )
  patchNode({ query_template: next })
}

function updatePromptRole(promptId: string, value: OFPromptItem['role']) {
  updatePrompt(promptId, { role: value })
}

function addPrompt() {
  const nextItem: OFPromptItem = {
    id: `knowledge_prompt_${Date.now()}`,
    role: promptItems.value.length === 0 ? 'user' : 'system',
    text: ''
  }
  patchNode({ query_template: [...promptItems.value, nextItem] })
}

function removePrompt(promptId: string) {
  patchNode({ query_template: promptItems.value.filter((item) => item.id !== promptId) })
}
</script>

<style scoped src="../../../../styles/node-panel.scss"></style>
