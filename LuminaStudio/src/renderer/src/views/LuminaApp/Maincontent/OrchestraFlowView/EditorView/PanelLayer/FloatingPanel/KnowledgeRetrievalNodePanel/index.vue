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
      <div class="of-panel-shell-body-inner of-doc-block">
        <section class="of-doc-section">
          <div class="of-doc-title-strong">基础信息</div>
          <div class="of-state-hint">
            该节点会根据查询模板和权限树配置，执行知识库检索并输出标准化命中结果。
          </div>
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
        </section>

        <div class="of-doc-divider"></div>

        <section class="of-doc-section">
          <div class="flex items-center justify-between gap-3">
            <div class="of-doc-title-row">
              <div class="of-doc-title-strong">查询模板</div>
            </div>
            <button class="of-state-inline-action" @click="addPrompt">添加消息</button>
          </div>

          <div v-if="promptItems.length === 0" class="of-state-empty">
            暂无查询模板，至少添加一条消息来描述检索问题。
          </div>

          <div v-for="item in promptItems" :key="item.id" class="of-doc-message-item">
            <div class="of-doc-message-head">
              <div class="of-doc-role-switch">
                <button
                  v-for="option in promptRoleOptions"
                  :key="option.value"
                  type="button"
                  class="of-doc-role-option"
                  :class="[
                    `of-doc-role-option-${String(option.value)}`,
                    { 'is-active': item.role === option.value }
                  ]"
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

        <div class="of-doc-divider"></div>

        <section class="of-doc-section">
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
          <div class="of-state-hint">
            若这里留空，运行时也可以从上游输入
            `knowledgeBaseId`；当前默认策略会放开该知识库下的全部文档。
          </div>

          <div class="of-doc-divider"></div>

          <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div>
              <div class="of-doc-title">重排设置</div>
              <div class="of-state-hint">可选启用 rerank，并限制返回前 N 条。</div>
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
              <div class="flex items-center justify-between gap-3">
                <div class="system-sm-semibold-uppercase text-gray-700">重排模型</div>
                <button
                  class="of-state-inline-action"
                  type="button"
                  @click="showModelSelector = true"
                >
                  选择模型
                </button>
              </div>
              <button
                type="button"
                class="of-ref-trigger mt-1 w-full text-left"
                @click="showModelSelector = true"
              >
                <span class="of-ref-text">{{ rerankModelDisplay }}</span>
              </button>
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
        </section>

        <div class="of-doc-divider"></div>

        <section class="of-doc-section">
          <div class="of-doc-title-strong">权限树概览</div>
          <div class="of-state-hint">
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

        <div class="of-doc-divider"></div>

        <section class="of-doc-section">
          <div class="of-doc-title-strong">输出说明</div>
          <div class="of-state-hint">
            该节点会输出 query、total_scopes、total_hits、partial_failure、items 与完整 result。
          </div>
          <div class="of-output-tree">
            <div class="of-output-tree-root">
              <span class="of-output-tree-root-label">Output</span>
            </div>

            <div
              v-for="(item, index) in outputPreviewItems"
              :key="item.name"
              class="of-output-tree-item of-output-tree-branch"
              :class="{ 'of-output-tree-item-last': index === outputPreviewItems.length - 1 }"
            >
              <span class="of-output-tree-prop">{{ item.name }}</span>
              <span>:</span>
              <span class="of-output-tree-type">{{ item.type }}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
    <ModelSelector
      v-model:visible="showModelSelector"
      :current-provider-id="rerankModelProviderId"
      :current-model-id="rerankModelLeafId"
      title="选择重排模型"
      search-placeholder="搜索 Provider 或模型..."
      :show-manage-button="false"
      @select="handleRerankModelSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { OFKnowledgeRetrievalNodeData, OFPromptItem } from '@shared/Orchestraflow-types'
import { useWorkflowEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor.store'
import { useWorkflowEditorUIStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor-ui.store'
import { useModelConfigStore } from '@renderer/stores/model-config/store'
import type { Model, ModelProvider } from '@renderer/stores/model-config/types'
import ModelSelector from '@renderer/components/ModelSelector/index.vue'
import { OF_PANEL_THEME } from '../panel-theme'
import PromptTextarea from '../PromptTextarea/index.vue'

const uiStore = useWorkflowEditorUIStore()
const editorStore = useWorkflowEditorStore()
const modelConfigStore = useModelConfigStore()
const theme = OF_PANEL_THEME.knowledgeRetrieval
const showModelSelector = ref(false)

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
const rerankModelProviderId = computed(() => rerankModelIdModel.value.split('/', 1)[0] || null)
const rerankModelLeafId = computed(() => {
  const [, ...rest] = rerankModelIdModel.value.split('/')
  return rest.length ? rest.join('/') : rerankModelIdModel.value || null
})
const rerankModelDisplay = computed(() => rerankModelIdModel.value || '未选择模型')

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

function handleRerankModelSelect(payload: { provider: ModelProvider; model: Model }) {
  rerankModelIdModel.value = `${payload.provider.id}/${payload.model.id}`
}

onMounted(() => {
  modelConfigStore.fetchProviders()
})
</script>

<style scoped src="../../../../styles/node-panel.scss"></style>
