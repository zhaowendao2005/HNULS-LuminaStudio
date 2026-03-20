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
            @click="enterDebugMode"
          >
            <svg viewBox="0 0 24 24" class="of-panel-icon-svg h-4 w-4" fill="currentColor">
              <path
                d="M8 18.3915V5.60846L18.2264 12L8 18.3915ZM6 3.80421V20.1957C6 20.9812 6.86395 21.46 7.53 21.0437L20.6432 12.848C21.2699 12.4563 21.2699 11.5436 20.6432 11.152L7.53 2.95621C6.86395 2.53993 6 3.01878 6 3.80421Z"
              />
            </svg>
          </button>
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

      <div class="of-panel-shell-tabs">
        <button
          class="system-md-semibold of-panel-tab-button"
          :class="
            activeTab === 'settings'
              ? [theme.tabActiveClass, 'of-panel-tab-button-active']
              : 'of-panel-tab-button-inactive'
          "
          @click="setActiveTab('settings')"
        >
          设置
        </button>
        <button
          class="system-md-semibold of-panel-tab-button"
          :class="
            activeTab === 'lastRun'
              ? [theme.tabActiveClass, 'of-panel-tab-button-active']
              : 'of-panel-tab-button-inactive'
          "
          @click="setActiveTab('lastRun')"
        >
          上次运行
        </button>
      </div>
    </div>

    <div class="of-panel-shell-body">
      <div
        v-if="activeTab === 'settings' && !debugMode"
        class="of-panel-shell-body-inner of-doc-block"
      >
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
              :ref="(el) => setPromptEditorRef(item.id, el)"
              :model-value="item.text"
              :height="88"
              placeholder="输入检索提示词，例如问题、关键词、过滤条件..."
              @update:model-value="updatePrompt(item.id, { text: $event })"
            />
            <div class="mt-2 flex items-center justify-end">
              <button
                class="of-state-inline-action"
                @click="openPromptVariableSelector(item.id, $event)"
              >
                插入变量
              </button>
            </div>
          </div>
        </section>

        <div class="of-doc-divider"></div>

        <section class="of-doc-section">
          <div class="of-doc-title-strong">检索配置</div>
          <div class="of-state-hint">按权限树范围与检索参数执行；支持知识库/文档两级多选。</div>

          <div class="of-kr-selection-summary mt-2">
            {{ permissionSelectionSummary }}
          </div>
          <div v-if="runtimeKnowledgeBaseLabel" class="of-kr-runtime-summary mt-1">
            运行时知识库：{{ runtimeKnowledgeBaseLabel }}
          </div>

          <div class="mt-2 flex items-center gap-3">
            <button
              ref="permissionSelectorTriggerRef"
              type="button"
              class="of-state-inline-action text-[13px]"
              @click="openPermissionSelector"
            >
              选择权限范围
            </button>
            <button
              type="button"
              class="of-state-inline-action text-[12px]"
              :disabled="permissionTreeLoading"
              @click="refreshKnowledgeBaseList"
            >
              {{ permissionTreeLoading ? '刷新中...' : '刷新数据' }}
            </button>
          </div>

          <div class="mt-3">
            <div class="of-panel-field-stack min-w-0">
              <div class="system-sm-semibold-uppercase text-gray-700">返回条数</div>
              <input
                v-model.number="topKModel"
                type="number"
                min="1"
                max="20"
                class="of-panel-input of-kr-compact-input"
              />
            </div>
          </div>

          <div class="mt-2">
            <div class="of-panel-field-stack min-w-0">
              <div class="system-sm-semibold-uppercase text-gray-700">EF</div>
              <input
                v-model.number="efModel"
                type="number"
                min="1"
                class="of-panel-input of-kr-compact-input"
                placeholder="留空为自动"
              />
            </div>
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
              <div class="system-sm-semibold-uppercase text-gray-700">重排模型</div>
              <button
                type="button"
                class="of-ref-trigger mt-1 w-full text-left"
                @click="showRerankSelector = true"
              >
                <span
                  class="of-ref-text block truncate"
                  :class="!hasRerankModel ? 'text-blue-600' : ''"
                >
                  {{ rerankModelDisplay }}
                </span>
              </button>
            </div>
            <div class="of-panel-field-stack">
              <div class="system-sm-semibold-uppercase text-gray-700">重排 TopN</div>
              <input
                v-model.number="rerankTopNModel"
                type="number"
                min="1"
                class="of-panel-input of-kr-compact-input"
                placeholder="可为空"
              />
            </div>
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
              <button
                class="ml-auto text-[10px] text-cyan-600 hover:text-cyan-700"
                @click="copyOutputPath(item.name)"
              >
                {{ copiedOutputName === item.name ? '已复制' : '复制路径' }}
              </button>
            </div>
          </div>
        </section>
      </div>
      <div v-else-if="activeTab === 'settings' && debugMode" class="of-panel-shell-body-inner">
        <NodeDebugForm
          :fields="debugFields"
          :model-value="debugFormValues"
          :running="nodeDebugStore.runningNodeId === uiStore.selectedNodeId"
          @update:model-value="handleDebugFormUpdate"
          @execute="executeNodeDebug"
        />
      </div>
      <div v-else-if="activeTab === 'lastRun'" class="of-panel-shell-body-inner">
        <NodeDebugLastRun
          :result="nodeDebugResult"
          :loading="nodeDebugStore.runningNodeId === uiStore.selectedNodeId"
        />
      </div>
    </div>
    <KnowledgePermissionTreePopover
      :visible="permissionSelectorVisible"
      :anchor-rect="permissionSelectorAnchorRect"
      :knowledge-bases="knowledgeBaseTree"
      :selection="permissionSelection"
      :loading-bases="permissionTreeLoading"
      :refreshing="permissionTreeRefreshing"
      @close="permissionSelectorVisible = false"
      @refresh="refreshKnowledgeBaseList"
      @request-load-documents="loadDocumentsByKnowledgeBaseId"
      @update:selection="handlePermissionSelectionChange"
    />
    <OrchestraflowRerankModelSelectorModal
      v-model:visible="showRerankSelector"
      :current-model-id="rerankModelIdModel || null"
      @select="handleRerankModelSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { OFKnowledgeRetrievalNodeData, OFPromptItem } from '@shared/Orchestraflow-types'
import type {
  KnowledgeRetrievalPermissionTreeNode,
  OFKnowledgePermissionTree
} from '@shared/knowledge-retrieval.types'
import type { RerankModelInfo } from '@preload/types'
import { useWorkflowEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor.store'
import { useWorkflowEditorUIStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor-ui.store'
import { useVariableSelectorStore } from '@renderer/stores/orchestraflow/workflow-editor/variable-selector/variable-selector.store'
import { useNodeDebugStore } from '@renderer/stores/orchestraflow/node-debug/node-debug.store'
import { OF_PANEL_THEME } from '../panel-theme'
import PromptTextarea from '../PromptTextarea/index.vue'
import type { NodeDebugField } from '../NodeDebug/NodeDebugForm.vue'
import NodeDebugForm from '../NodeDebug/NodeDebugForm.vue'
import NodeDebugLastRun from '../NodeDebug/NodeDebugLastRun.vue'
import KnowledgePermissionTreePopover from './KnowledgePermissionTreePopover.vue'
import OrchestraflowRerankModelSelectorModal from './OrchestraflowRerankModelSelectorModal.vue'

const uiStore = useWorkflowEditorUIStore()
const editorStore = useWorkflowEditorStore()
const variableSelectorStore = useVariableSelectorStore()
const nodeDebugStore = useNodeDebugStore()
const theme = OF_PANEL_THEME.knowledgeRetrieval
const showRerankSelector = ref(false)
const copiedOutputName = ref('')
const activeTab = ref<'settings' | 'lastRun'>('settings')
const debugMode = ref(false)
const promptEditorRefs = new Map<string, { getCursorPosition: () => number }>()
const activePromptTarget = ref<{ promptId: string; cursorPosition: number } | null>(null)
const permissionSelectorVisible = ref(false)
const permissionSelectorTriggerRef = ref<HTMLElement | null>(null)
const permissionSelectorAnchorRect = ref<DOMRect | null>(null)
const permissionTreeLoading = ref(false)
const permissionTreeRefreshing = ref(false)

interface PermissionDocumentNode {
  id: string
  fileKey: string
  fileName: string
}

interface PermissionKnowledgeBaseNode {
  id: number
  name: string
  docCount: number
  documentsLoaded: boolean
  loadingDocuments: boolean
  documents: PermissionDocumentNode[]
}

interface PermissionSelectionModel {
  selectedKnowledgeBaseIds: number[]
  selectedDocumentsByBase: Record<number, string[]>
}

const knowledgeBaseTree = ref<PermissionKnowledgeBaseNode[]>([])
const permissionSelection = ref<PermissionSelectionModel>({
  selectedKnowledgeBaseIds: [],
  selectedDocumentsByBase: {}
})

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
const hasRerankModel = computed(() => Boolean(rerankModelIdModel.value))
const rerankModelDisplay = computed(() => rerankModelIdModel.value || '选择模型')

const rerankTopNModel = computed({
  get: () => (nodeData.value?.rerank_top_n ?? '') as number | '',
  set: (value: number | '') => {
    const normalized = value === '' ? null : Math.max(1, Number(value || 1))
    patchNode({ rerank_top_n: normalized })
  }
})

const selectedKnowledgeBaseCount = computed(() => {
  const selectedIds = new Set(permissionSelection.value.selectedKnowledgeBaseIds)
  Object.keys(permissionSelection.value.selectedDocumentsByBase || {}).forEach((key) => {
    const knowledgeBaseId = Number(key)
    if (Number.isInteger(knowledgeBaseId) && knowledgeBaseId > 0) {
      selectedIds.add(knowledgeBaseId)
    }
  })
  return selectedIds.size
})

const selectedDocumentCount = computed(() => {
  const selectedKnowledgeBaseIds = new Set(permissionSelection.value.selectedKnowledgeBaseIds)
  const selectedDocumentsByBase = permissionSelection.value.selectedDocumentsByBase || {}
  let totalCount = 0

  for (const knowledgeBase of knowledgeBaseTree.value) {
    const partialSelectedDocuments = selectedDocumentsByBase[knowledgeBase.id] || []
    if (selectedKnowledgeBaseIds.has(knowledgeBase.id) && partialSelectedDocuments.length === 0) {
      totalCount += knowledgeBase.documentsLoaded
        ? knowledgeBase.documents.length
        : knowledgeBase.docCount
      continue
    }
    totalCount += partialSelectedDocuments.length
  }

  return totalCount
})

const permissionSelectionSummary = computed(
  () => `已选 ${selectedKnowledgeBaseCount.value} 知识库 / 已选 ${selectedDocumentCount.value} 文档`
)

const knowledgeBaseBadge = computed(() => permissionSelectionSummary.value)

const efSummary = computed(() => {
  return nodeData.value?.ef ? `EF ${nodeData.value.ef}` : 'EF 自动'
})

const rerankSummary = computed(() => {
  if (!nodeData.value?.rerank_enabled) return '未启用重排'
  return `重排 TOP ${nodeData.value.rerank_top_n || '自动'}`
})

const runtimeKnowledgeBaseId = computed(() => {
  const currentPermissionTree = nodeData.value?.permission_tree
  return resolveRuntimeKnowledgeBaseId(permissionSelection.value, currentPermissionTree)
})

const runtimeKnowledgeBaseLabel = computed(() => {
  if (!runtimeKnowledgeBaseId.value) return ''
  const matchedKnowledgeBase = knowledgeBaseTree.value.find(
    (item) => item.id === runtimeKnowledgeBaseId.value
  )
  return matchedKnowledgeBase
    ? `${matchedKnowledgeBase.name} (#${matchedKnowledgeBase.id})`
    : `#${runtimeKnowledgeBaseId.value}`
})

const outputPreviewItems = computed(() => {
  const variables = nodeData.value?.output?.variables || []
  return variables.map((item) => ({
    name: item.variable,
    type: String(item.type || 'string')
  }))
})

const debugFields = computed<NodeDebugField[]>(() => {
  const matched = new Set<string>()
  const fields: NodeDebugField[] = []

  for (const item of promptItems.value) {
    const regex = /\{\{\s*([\w.]+)\s*\}\}/g
    for (const match of item.text.matchAll(regex)) {
      const key = match[1]
      if (!key || matched.has(key)) continue
      matched.add(key)
      fields.push({
        key,
        label: key,
        required: false,
        placeholder: `请输入 ${key}`
      })
    }
  }

  return fields
})

const debugFormValues = computed(() => {
  const nodeId = uiStore.selectedNodeId
  return nodeId ? nodeDebugStore.getNodeFormValues(nodeId) : {}
})

const nodeDebugResult = computed(() => {
  const nodeId = uiStore.selectedNodeId
  return nodeId ? nodeDebugStore.getLastRun(nodeId) : undefined
})

function setActiveTab(tab: 'settings' | 'lastRun') {
  activeTab.value = tab
  if (tab !== 'settings') {
    debugMode.value = false
  }
}

function enterDebugMode() {
  debugMode.value = true
  activeTab.value = 'settings'
}

function handleClose() {
  uiStore.closeNodeConfigPanel()
}

function patchNode(patch: Partial<OFKnowledgeRetrievalNodeData>) {
  if (!currentNode.value) return
  editorStore.updateNode(currentNode.value.id, patch)
}

function areSelectionsEqual(
  left: PermissionSelectionModel,
  right: PermissionSelectionModel
): boolean {
  const leftPayload = JSON.stringify(normalizePermissionSelection(left))
  const rightPayload = JSON.stringify(normalizePermissionSelection(right))
  return leftPayload === rightPayload
}

function normalizePermissionSelection(
  input: PermissionSelectionModel,
  validKnowledgeBaseIds?: Set<number>
): PermissionSelectionModel {
  const selectedKnowledgeBaseIds = Array.from(
    new Set(
      (input.selectedKnowledgeBaseIds || []).filter(
        (value): value is number =>
          typeof value === 'number' &&
          Number.isInteger(value) &&
          value > 0 &&
          (!validKnowledgeBaseIds || validKnowledgeBaseIds.has(value))
      )
    )
  ).sort((a, b) => a - b)

  const selectedDocumentsByBase: Record<number, string[]> = {}
  Object.entries(input.selectedDocumentsByBase || {}).forEach(([key, value]) => {
    const knowledgeBaseId = Number(key)
    if (!Number.isInteger(knowledgeBaseId) || knowledgeBaseId <= 0) return
    if (validKnowledgeBaseIds && !validKnowledgeBaseIds.has(knowledgeBaseId)) return

    const documentKeys = Array.from(
      new Set(Array.isArray(value) ? value.filter(Boolean) : [])
    ).sort()
    if (documentKeys.length > 0) {
      selectedDocumentsByBase[knowledgeBaseId] = documentKeys
    }
  })

  return {
    selectedKnowledgeBaseIds,
    selectedDocumentsByBase
  }
}

function resolveRuntimeKnowledgeBaseId(
  selection: PermissionSelectionModel,
  permissionTree: OFKnowledgePermissionTree | undefined
): number | null {
  const selectedKnowledgeBaseIds = new Set(selection.selectedKnowledgeBaseIds || [])
  Object.keys(selection.selectedDocumentsByBase || {}).forEach((key) => {
    const knowledgeBaseId = Number(key)
    if (Number.isInteger(knowledgeBaseId) && knowledgeBaseId > 0) {
      selectedKnowledgeBaseIds.add(knowledgeBaseId)
    }
  })

  const preferredKnowledgeBaseId = permissionTree?.knowledgeBaseId
  if (
    typeof preferredKnowledgeBaseId === 'number' &&
    Number.isInteger(preferredKnowledgeBaseId) &&
    preferredKnowledgeBaseId > 0 &&
    selectedKnowledgeBaseIds.has(preferredKnowledgeBaseId)
  ) {
    return preferredKnowledgeBaseId
  }

  const [firstKnowledgeBaseId] = Array.from(selectedKnowledgeBaseIds).sort((a, b) => a - b)
  return firstKnowledgeBaseId || null
}

function extractKnowledgeBaseIdFromTreeNode(
  node: KnowledgeRetrievalPermissionTreeNode
): number | null {
  if (node.kind !== 'knowledge-base') return null
  if (!node.id?.startsWith('kb:')) return null
  const knowledgeBaseId = Number(node.id.slice(3))
  return Number.isInteger(knowledgeBaseId) && knowledgeBaseId > 0 ? knowledgeBaseId : null
}

function extractDocumentFileKey(
  node: KnowledgeRetrievalPermissionTreeNode,
  knowledgeBaseId: number
): string | null {
  if (node.kind !== 'file') return null
  const prefix = `file:${knowledgeBaseId}:`
  if (!node.id?.startsWith(prefix)) return null
  return decodeURIComponent(node.id.slice(prefix.length))
}

function walkPermissionTreeNodes(
  nodes: KnowledgeRetrievalPermissionTreeNode[],
  visitor: (
    node: KnowledgeRetrievalPermissionTreeNode,
    parentKnowledgeBaseId: number | null
  ) => void,
  parentKnowledgeBaseId: number | null = null
) {
  for (const node of nodes) {
    const currentKnowledgeBaseId = extractKnowledgeBaseIdFromTreeNode(node) ?? parentKnowledgeBaseId
    visitor(node, currentKnowledgeBaseId)
    if (Array.isArray(node.children) && node.children.length > 0) {
      walkPermissionTreeNodes(node.children, visitor, currentKnowledgeBaseId)
    }
  }
}

function parsePermissionSelectionFromNodeData(
  permissionTree: OFKnowledgePermissionTree | undefined
): PermissionSelectionModel {
  if (!permissionTree) {
    return {
      selectedKnowledgeBaseIds: [],
      selectedDocumentsByBase: {}
    }
  }

  const selectedKnowledgeBaseIds = new Set<number>()
  const selectedDocumentsByBase: Record<number, Set<string>> = {}

  const runtimeKnowledgeBaseId = permissionTree.knowledgeBaseId
  if (
    typeof runtimeKnowledgeBaseId === 'number' &&
    Number.isInteger(runtimeKnowledgeBaseId) &&
    runtimeKnowledgeBaseId > 0
  ) {
    if ((permissionTree.documents || []).length === 0 && permissionTree.effect === 'allow') {
      selectedKnowledgeBaseIds.add(runtimeKnowledgeBaseId)
    }
    for (const documentRule of permissionTree.documents || []) {
      if (!documentRule.fileKey) continue
      if (!selectedDocumentsByBase[runtimeKnowledgeBaseId]) {
        selectedDocumentsByBase[runtimeKnowledgeBaseId] = new Set<string>()
      }
      selectedDocumentsByBase[runtimeKnowledgeBaseId].add(documentRule.fileKey)
    }
  }

  walkPermissionTreeNodes(permissionTree.providers || [], (node, parentKnowledgeBaseId) => {
    if (node.kind === 'knowledge-base' && node.checked && parentKnowledgeBaseId) {
      selectedKnowledgeBaseIds.add(parentKnowledgeBaseId)
      return
    }

    if (!node.checked || node.kind !== 'file' || !parentKnowledgeBaseId) {
      return
    }

    const fileKey = extractDocumentFileKey(node, parentKnowledgeBaseId)
    if (!fileKey) return
    if (!selectedDocumentsByBase[parentKnowledgeBaseId]) {
      selectedDocumentsByBase[parentKnowledgeBaseId] = new Set<string>()
    }
    selectedDocumentsByBase[parentKnowledgeBaseId].add(fileKey)
  })

  const normalizedSelection: PermissionSelectionModel = {
    selectedKnowledgeBaseIds: Array.from(selectedKnowledgeBaseIds).sort((a, b) => a - b),
    selectedDocumentsByBase: {}
  }
  Object.entries(selectedDocumentsByBase).forEach(([key, fileKeys]) => {
    if (!fileKeys.size) return
    normalizedSelection.selectedDocumentsByBase[Number(key)] = Array.from(fileKeys).sort()
  })
  return normalizePermissionSelection(normalizedSelection)
}

function buildPermissionProviders(
  selection: PermissionSelectionModel
): KnowledgeRetrievalPermissionTreeNode[] {
  const selectedKnowledgeBaseIds = new Set(selection.selectedKnowledgeBaseIds || [])
  const selectedDocumentsByBase = selection.selectedDocumentsByBase || {}

  return knowledgeBaseTree.value
    .filter(
      (knowledgeBase) =>
        selectedKnowledgeBaseIds.has(knowledgeBase.id) ||
        (selectedDocumentsByBase[knowledgeBase.id] || []).length > 0
    )
    .map((knowledgeBase) => {
      const selectedDocuments = new Set(selectedDocumentsByBase[knowledgeBase.id] || [])
      const knowledgeBaseChecked = selectedKnowledgeBaseIds.has(knowledgeBase.id)
      const children: KnowledgeRetrievalPermissionTreeNode[] = []

      for (const document of knowledgeBase.documents) {
        children.push({
          id: `file:${knowledgeBase.id}:${encodeURIComponent(document.fileKey)}`,
          label: document.fileName,
          kind: 'file',
          checked: knowledgeBaseChecked ? true : selectedDocuments.has(document.fileKey),
          description: document.fileKey
        })
      }

      // 中文注释：兼容“旧数据里存在文档规则但当前文档列表尚未加载”的场景，避免回写时把选择项丢掉。
      for (const selectedFileKey of selectedDocuments) {
        if (knowledgeBase.documents.some((item) => item.fileKey === selectedFileKey)) {
          continue
        }
        children.push({
          id: `file:${knowledgeBase.id}:${encodeURIComponent(selectedFileKey)}`,
          label: selectedFileKey,
          kind: 'file',
          checked: true,
          description: selectedFileKey
        })
      }

      return {
        id: `kb:${knowledgeBase.id}`,
        label: knowledgeBase.name,
        kind: 'knowledge-base',
        checked: knowledgeBaseChecked,
        description: `${knowledgeBase.docCount} documents`,
        children
      }
    })
}

function buildPermissionTreePatch(selection: PermissionSelectionModel): OFKnowledgePermissionTree {
  const currentPermissionTree = nodeData.value?.permission_tree
  const runtimeKnowledgeBaseId = resolveRuntimeKnowledgeBaseId(selection, currentPermissionTree)
  const selectedDocumentsByBase = selection.selectedDocumentsByBase || {}
  const runtimeSelectedDocuments = runtimeKnowledgeBaseId
    ? selectedDocumentsByBase[runtimeKnowledgeBaseId] || []
    : []

  const runtimeKnowledgeBase = knowledgeBaseTree.value.find(
    (knowledgeBase) => knowledgeBase.id === runtimeKnowledgeBaseId
  )
  const runtimeTotalDocuments = runtimeKnowledgeBase
    ? runtimeKnowledgeBase.documentsLoaded
      ? runtimeKnowledgeBase.documents.length
      : runtimeKnowledgeBase.docCount
    : 0

  const useDocumentRules =
    Boolean(runtimeKnowledgeBaseId) &&
    runtimeSelectedDocuments.length > 0 &&
    (runtimeTotalDocuments === 0 || runtimeSelectedDocuments.length < runtimeTotalDocuments)

  return {
    ...(currentPermissionTree || { providers: [] }),
    providers: buildPermissionProviders(selection),
    knowledgeBaseId: runtimeKnowledgeBaseId,
    effect: runtimeKnowledgeBaseId ? (useDocumentRules ? 'deny' : 'allow') : 'deny',
    documents: useDocumentRules
      ? runtimeSelectedDocuments.map((fileKey) => ({
          fileKey,
          effect: 'allow' as const
        }))
      : undefined
  }
}

function patchPermissionTreeBySelection(selection: PermissionSelectionModel) {
  patchNode({
    permission_tree: buildPermissionTreePatch(selection)
  })
}

function patchKnowledgeBaseTreeNode(
  knowledgeBaseId: number,
  patcher: (knowledgeBase: PermissionKnowledgeBaseNode) => PermissionKnowledgeBaseNode
) {
  knowledgeBaseTree.value = knowledgeBaseTree.value.map((knowledgeBase) =>
    knowledgeBase.id === knowledgeBaseId ? patcher(knowledgeBase) : knowledgeBase
  )
}

async function loadKnowledgeBaseList(refresh = false) {
  if (permissionTreeLoading.value && !refresh) return
  if (refresh) {
    permissionTreeRefreshing.value = true
  } else {
    permissionTreeLoading.value = true
  }

  try {
    const response = await window.api.knowledgeDatabase.listKnowledgeBases()
    if (!response.success || !response.data) {
      throw new Error(response.error || '加载知识库失败')
    }

    const previousKnowledgeBaseMap = new Map(
      knowledgeBaseTree.value.map((knowledgeBase) => [knowledgeBase.id, knowledgeBase])
    )
    knowledgeBaseTree.value = response.data.knowledgeBases.map((knowledgeBase) => {
      const previous = previousKnowledgeBaseMap.get(knowledgeBase.id)
      return {
        id: knowledgeBase.id,
        name: knowledgeBase.name,
        docCount: Math.max(knowledgeBase.docCount || 0, previous?.docCount || 0),
        documentsLoaded: previous?.documentsLoaded || false,
        loadingDocuments: false,
        documents: previous?.documents || []
      }
    })

    const validKnowledgeBaseIds = new Set(
      knowledgeBaseTree.value.map((knowledgeBase) => knowledgeBase.id)
    )
    const normalizedSelection = normalizePermissionSelection(
      permissionSelection.value,
      validKnowledgeBaseIds
    )
    if (!areSelectionsEqual(permissionSelection.value, normalizedSelection)) {
      permissionSelection.value = normalizedSelection
      patchPermissionTreeBySelection(permissionSelection.value)
    }
  } catch (error) {
    console.error('[KnowledgeRetrievalNodePanel] 加载知识库列表失败', error)
  } finally {
    permissionTreeLoading.value = false
    permissionTreeRefreshing.value = false
  }
}

async function loadDocumentsByKnowledgeBaseId(knowledgeBaseId: number, forceRefresh = false) {
  const targetKnowledgeBase = knowledgeBaseTree.value.find((item) => item.id === knowledgeBaseId)
  if (!targetKnowledgeBase) return
  if (targetKnowledgeBase.loadingDocuments) return
  if (targetKnowledgeBase.documentsLoaded && !forceRefresh) return

  patchKnowledgeBaseTreeNode(knowledgeBaseId, (knowledgeBase) => ({
    ...knowledgeBase,
    loadingDocuments: true
  }))

  try {
    const documents: PermissionDocumentNode[] = []
    let page = 1
    const pageSize = 200
    let totalPages = 1

    while (page <= totalPages) {
      const response = await window.api.knowledgeDatabase.listDocuments({
        knowledgeBaseId,
        page,
        pageSize
      })
      if (!response.success || !response.data) {
        throw new Error(response.error || `加载文档失败 (knowledgeBaseId=${knowledgeBaseId})`)
      }
      totalPages = Math.max(response.data.totalPages || 1, 1)
      response.data.documents.forEach((document) => {
        documents.push({
          id: document.id,
          fileKey: document.fileKey,
          fileName: document.fileName
        })
      })
      page += 1
    }

    const uniqueDocumentMap = new Map<string, PermissionDocumentNode>()
    documents.forEach((document) => {
      uniqueDocumentMap.set(document.fileKey, document)
    })

    patchKnowledgeBaseTreeNode(knowledgeBaseId, (knowledgeBase) => ({
      ...knowledgeBase,
      loadingDocuments: false,
      documentsLoaded: true,
      docCount: Math.max(knowledgeBase.docCount, uniqueDocumentMap.size),
      documents: Array.from(uniqueDocumentMap.values()).sort((left, right) =>
        left.fileName.localeCompare(right.fileName)
      )
    }))
  } catch (error) {
    patchKnowledgeBaseTreeNode(knowledgeBaseId, (knowledgeBase) => ({
      ...knowledgeBase,
      loadingDocuments: false
    }))
    console.error('[KnowledgeRetrievalNodePanel] 加载文档失败', error)
  }
}

async function refreshKnowledgeBaseList() {
  await loadKnowledgeBaseList(true)
  await Promise.all(
    knowledgeBaseTree.value
      .filter((knowledgeBase) => knowledgeBase.documentsLoaded)
      .map((knowledgeBase) => loadDocumentsByKnowledgeBaseId(knowledgeBase.id, true))
  )
}

function syncPermissionSelectionFromNode() {
  const parsedSelection = parsePermissionSelectionFromNodeData(nodeData.value?.permission_tree)
  if (areSelectionsEqual(permissionSelection.value, parsedSelection)) {
    return
  }
  permissionSelection.value = parsedSelection
}

function handlePermissionSelectionChange(nextSelection: PermissionSelectionModel) {
  permissionSelection.value = normalizePermissionSelection(nextSelection)
  patchPermissionTreeBySelection(permissionSelection.value)
}

function openPermissionSelector(event: MouseEvent) {
  const anchorElement =
    (event.currentTarget as HTMLElement | null) || permissionSelectorTriggerRef.value
  permissionSelectorAnchorRect.value = anchorElement?.getBoundingClientRect() || null
  if (!knowledgeBaseTree.value.length) {
    void loadKnowledgeBaseList()
  }
  permissionSelectorVisible.value = true
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

function setPromptEditorRef(id: string, instance: unknown) {
  if (instance && typeof instance === 'object') {
    promptEditorRefs.set(id, instance as { getCursorPosition: () => number })
  } else {
    promptEditorRefs.delete(id)
  }
}

function openPromptVariableSelector(promptId: string, event: MouseEvent) {
  if (!currentNode.value) return
  const anchorRect =
    (event.currentTarget as HTMLElement | null)?.getBoundingClientRect() || undefined
  const anchorPoint = { x: event.clientX, y: event.clientY }
  const editorRef = promptEditorRefs.get(promptId)
  activePromptTarget.value = {
    promptId,
    cursorPosition: editorRef?.getCursorPosition?.() || 0
  }
  variableSelectorStore.openSelector(
    currentNode.value.id,
    'prompt',
    activePromptTarget.value.cursorPosition,
    anchorRect,
    anchorPoint
  )
}

function insertVariableIntoPrompt(promptId: string, variablePath: string, cursorPosition: number) {
  const item = promptItems.value.find((entry) => entry.id === promptId)
  if (!item) return
  const insertion = `{{${variablePath}}}`
  const start = Math.max(0, Math.min(cursorPosition, item.text.length))
  updatePrompt(promptId, {
    text: `${item.text.slice(0, start)}${insertion}${item.text.slice(start)}`
  })
}

function handleVariableSelect(event: Event) {
  const detail = (event as CustomEvent).detail
  if (
    detail?.nodeId !== uiStore.selectedNodeId ||
    detail?.targetType !== 'prompt' ||
    !activePromptTarget.value
  ) {
    return
  }
  insertVariableIntoPrompt(
    activePromptTarget.value.promptId,
    detail.variable.path,
    activePromptTarget.value.cursorPosition
  )
  activePromptTarget.value = null
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

function handleRerankModelSelect(model: RerankModelInfo) {
  // 关键约束：OrchestraFlow 的 rerank_model_id 直接保存后端返回的模型 id，
  // 不再拼接 providerId/modelId，避免检索执行时出现模型 id 不可识别。
  rerankModelIdModel.value = model.id
}

function handleDebugFormUpdate(values: Record<string, any>) {
  if (!uiStore.selectedNodeId) return
  Object.entries(values).forEach(([key, value]) => {
    nodeDebugStore.setNodeFormValue(uiStore.selectedNodeId!, key, value)
  })
}

async function executeNodeDebug(values: Record<string, any>) {
  if (!editorStore.currentWorkflowId || !uiStore.selectedNodeId) return
  debugMode.value = false
  activeTab.value = 'lastRun'
  await nodeDebugStore.runNodeDebug({
    workflowId: editorStore.currentWorkflowId,
    nodeId: uiStore.selectedNodeId,
    inputs: { ...values },
    scopePath: editorStore.getNodeAncestorPath(uiStore.selectedNodeId)
  })
}

async function copyOutputPath(variableName: string) {
  const namespace = nodeData.value?.output_namespace || 'knowledge_retrieval'
  const outputPath = `{{${namespace}.${variableName}}}`
  try {
    await navigator.clipboard.writeText(outputPath)
    copiedOutputName.value = variableName
    setTimeout(() => {
      if (copiedOutputName.value === variableName) {
        copiedOutputName.value = ''
      }
    }, 1200)
  } catch {
    copiedOutputName.value = variableName
  }
}

watch(
  () => currentNode.value?.id,
  () => {
    permissionSelectorVisible.value = false
    syncPermissionSelectionFromNode()
  },
  { immediate: true }
)

watch(
  () => nodeData.value?.permission_tree,
  () => {
    syncPermissionSelectionFromNode()
  },
  { deep: true }
)

onMounted(async () => {
  await loadKnowledgeBaseList()
  window.addEventListener('of:variable-select', handleVariableSelect as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('of:variable-select', handleVariableSelect as EventListener)
})
</script>

<style scoped src="../../../../styles/node-panel.scss"></style>
<style scoped>
/* 小输入框统一灰色填充背景，降低“白底碎片感”，让表单区更聚合。 */
.of-knowledge-retrieval-node-panel :deep(.of-panel-input),
.of-knowledge-retrieval-node-panel input[type='number'],
.of-knowledge-retrieval-node-panel input[type='text'],
.of-knowledge-retrieval-node-panel :deep(.of-declare-text-input) {
  background-color: #f3f4f6;
  border-color: #e5e7eb;
  padding: 0 10px;
}

.of-knowledge-retrieval-node-panel :deep(.of-panel-input:focus),
.of-knowledge-retrieval-node-panel input[type='number']:focus,
.of-knowledge-retrieval-node-panel input[type='text']:focus,
.of-knowledge-retrieval-node-panel :deep(.of-declare-text-input:focus) {
  background-color: #eef2ff;
  border-color: #c7d2fe;
}

.of-knowledge-retrieval-node-panel {
  overflow-x: hidden;
}

.of-knowledge-retrieval-node-panel :deep(.of-panel-shell-body),
.of-knowledge-retrieval-node-panel :deep(.of-panel-shell-body-inner),
.of-knowledge-retrieval-node-panel :deep(.of-doc-block),
.of-knowledge-retrieval-node-panel :deep(.of-doc-section) {
  overflow-x: hidden;
}

.of-kr-param-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  width: 100%;
}

.of-kr-half-field {
  flex: 0 0 calc(50% - 4px);
  max-width: calc(50% - 4px);
  min-width: 0;
}

.of-kr-half-field :deep(.of-panel-input),
.of-kr-half-field input {
  width: 100%;
}

/* 紧凑输入：比默认 h-10 小一档，读写更像普通参数框。 */
.of-knowledge-retrieval-node-panel :deep(.of-kr-compact-input) {
  height: 34px;
  border-radius: 8px;
}

/* 去掉 number 输入右侧上下调节器，避免“边上有个可调节控件”的观感。 */
.of-knowledge-retrieval-node-panel input[type='number']::-webkit-outer-spin-button,
.of-knowledge-retrieval-node-panel input[type='number']::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.of-knowledge-retrieval-node-panel input[type='number'] {
  -moz-appearance: textfield;
}

/* “按钮性质文字”高亮：让可点动作和普通说明文案显著区分。 */
.of-knowledge-retrieval-node-panel :deep(.of-state-inline-action),
.of-knowledge-retrieval-node-panel :deep(.of-panel-tab-button),
.of-knowledge-retrieval-node-panel button.text-\[10px\] {
  color: #2563eb;
  font-weight: 600;
}

.of-knowledge-retrieval-node-panel :deep(.of-state-inline-action:hover),
.of-knowledge-retrieval-node-panel :deep(.of-panel-tab-button:hover),
.of-knowledge-retrieval-node-panel button.text-\[10px\]:hover {
  color: #1d4ed8;
}

.of-kr-selection-summary {
  font-size: 12px;
  line-height: 18px;
  color: #374151;
}

.of-kr-runtime-summary {
  font-size: 11px;
  line-height: 16px;
  color: #6b7280;
}
</style>
