<template>
  <div class="of-panel-shell of-node-config-panel of-end-panel" :class="theme.panelClass">
    <!-- 头部 -->
    <div class="of-panel-shell-header">
      <!-- 标题行：图标 + 输入框 + 操作按钮 -->
      <div class="of-panel-shell-title-row">
        <!-- 节点图标 -->
        <div
          class="of-panel-shell-icon"
          :class="theme.iconBgClass"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
          >
            <path
              d="M12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3ZM9 9.75C9 9.33579 9.33579 9 9.75 9H14.25C14.6642 9 15 9.33579 15 9.75V14.25C15 14.6642 14.6642 15 14.25 15H9.75C9.33579 15 9 14.6642 9 14.25V9.75Z"
              fill="currentColor"
            />
          </svg>
        </div>

        <!-- 标题输入框 -->
        <input
          v-model="localTitle"
          class="system-xl-semibold of-panel-shell-title-input"
          placeholder="添加标题..."
        />

        <!-- 操作按钮 -->
        <div class="of-panel-shell-actions">
          <!-- 调试按钮 -->
          <CapsuleTooltip text="调试运行" placement="bottom">
            <div
              class="of-panel-icon-button flex h-6 w-6 cursor-pointer items-center justify-center rounded-md"
              @click="enterDebugMode"
            >
              <svg
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="currentColor"
                class="of-panel-icon-svg h-4 w-4"
              >
                <path
                  d="M8 18.3915V5.60846L18.2264 12L8 18.3915ZM6 3.80421V20.1957C6 20.9812 6.86395 21.46 7.53 21.0437L20.6432 12.848C21.2699 12.4563 21.2699 11.5436 20.6432 11.152L7.53 2.95621C6.86395 2.53993 6 3.01878 6 3.80421Z"
                />
              </svg>
            </div>
          </CapsuleTooltip>
          <!-- 文档链接 -->
          <CapsuleTooltip text="查看文档" placement="bottom">
            <a
              href="https://docs.dify.ai/zh/use-dify/nodes/end"
              target="_blank"
              class="of-panel-icon-button flex h-6 w-6 items-center justify-center rounded-md"
            >
              <svg
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="currentColor"
                class="of-panel-icon-svg h-4 w-4"
              >
                <path
                  d="M13 21V23H11V21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H9C10.1947 3 11.2671 3.52375 12 4.35418C12.7329 3.52375 13.8053 3 15 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H13ZM20 19V5H15C13.8954 5 13 5.89543 13 7V19H20ZM11 19V7C11 5.89543 10.1046 5 9 5H4V19H11Z"
                />
              </svg>
            </a>
          </CapsuleTooltip>
          <!-- 三点菜单 -->
          <CapsuleTooltip text="更多操作" placement="bottom">
            <div
              class="of-panel-icon-button flex h-6 w-6 cursor-pointer items-center justify-center rounded-md"
            >
              <svg
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="currentColor"
                class="of-panel-icon-svg h-4 w-4"
              >
                <path
                  d="M5 10C3.9 10 3 10.9 3 12C3 13.1 3.9 14 5 14C6.1 14 7 13.1 7 12C7 10.9 6.1 10 5 10ZM19 10C17.9 10 17 10.9 17 12C17 13.1 17.9 14 19 14C20.1 14 21 13.1 21 12C21 10.9 20.1 10 19 10ZM12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10Z"
                />
              </svg>
            </div>
          </CapsuleTooltip>
          <!-- 关闭按钮 -->
          <CapsuleTooltip text="关闭面板" placement="bottom">
            <div
              class="of-panel-icon-button flex h-6 w-6 cursor-pointer items-center justify-center rounded-md"
              @click="handleClose"
            >
              <svg
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="currentColor"
                class="of-panel-icon-svg h-4 w-4"
              >
                <path
                  d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.0502 5.63672L11.9997 10.5865Z"
                />
              </svg>
            </div>
          </CapsuleTooltip>
        </div>
      </div>

      <!-- 描述文本框 -->
      <div class="of-panel-shell-description">
        <textarea
          v-model="localDesc"
          class="of-panel-shell-description-input"
          placeholder="添加描述..."
          :style="{ height: '18px' }"
        />
      </div>

      <!-- Tab 切换 -->
      <div class="flex items-center justify-between mt-3">
        <div class="of-panel-shell-tabs">
          <div
            class="system-md-semibold of-panel-tab-button relative flex cursor-pointer items-center"
            :class="
              activeTab === 'settings'
                ? [theme.tabActiveClass, 'of-panel-tab-button-active']
                : 'of-panel-tab-button-inactive'
            "
            @click="setActiveTab('settings')"
          >
            设置
          </div>
          <div
            class="system-md-semibold of-panel-tab-button relative flex cursor-pointer items-center"
            :class="
              activeTab === 'lastRun'
                ? [theme.tabActiveClass, 'of-panel-tab-button-active']
                : 'of-panel-tab-button-inactive'
            "
            @click="setActiveTab('lastRun')"
          >
            上次运行
          </div>
        </div>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="of-panel-shell-body">
      <!-- 设置 Tab -->
      <div v-if="activeTab === 'settings' && !debugMode" class="of-panel-shell-body-inner">
        <section class="of-panel-section">
          <div class="flex items-center justify-between">
            <div class="system-sm-semibold-uppercase text-gray-700">
              输出变量
              <span class="text-red-500">*</span>
            </div>
            <div class="flex items-center gap-2">
              <div
                class="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                :class="theme.softBadgeClass"
              >
                END
              </div>
              <button
                class="text-xs font-semibold text-cyan-600 hover:text-cyan-700"
                @click="openOutputVariableSelector"
              >
                引用变量
              </button>
            </div>
          </div>

          <div v-if="localOutputs.length === 0" class="of-panel-empty text-left">
            暂无输出变量，点击下方添加或引用变量。
          </div>

          <div v-else class="of-panel-list-separated">
            <div
              v-for="(output, index) in localOutputs"
              :key="index"
              class="group of-panel-list-row"
            >
              <div class="min-w-0 flex-1">
                <div class="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div
                      class="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400"
                    >
                      显示名
                    </div>
                    <input
                      :value="output.label || ''"
                      class="min-w-0 w-full border-0 border-b border-gray-200 bg-transparent px-0 font-semibold text-cyan-600 outline-none placeholder:text-gray-300"
                      placeholder="label"
                      @input="updateOutputLabel(index, ($event.target as HTMLInputElement).value)"
                    />
                  </div>
                  <div>
                    <div
                      class="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400"
                    >
                      变量名
                    </div>
                    <input
                      :value="output.variable"
                      class="min-w-0 w-full border-0 border-b border-gray-200 bg-transparent px-0 font-semibold text-emerald-600 outline-none placeholder:text-gray-300"
                      placeholder="variable"
                      @input="
                        updateOutputVariable(index, ($event.target as HTMLInputElement).value)
                      "
                    />
                  </div>
                </div>
                <div class="mt-2 flex items-center gap-2 text-xs">
                  <input
                    :value="output.type || 'string'"
                    class="w-20 border-0 bg-transparent px-0 text-gray-400 outline-none"
                    readonly
                  />
                  <span class="text-gray-300">·</span>
                  <span class="truncate text-gray-400">
                    {{
                      (output.label || '未命名显示名') + ' / ' + (output.variable || '未命名变量')
                    }}
                  </span>
                </div>
                <div class="mt-1 text-xs text-gray-400">
                  {{ output.value_selector?.join('.') || '未绑定变量路径' }}
                </div>
              </div>
              <button
                type="button"
                class="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                @click="removeOutput(index)"
              >
                <svg
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  class="h-4 w-4 text-gray-400 hover:text-red-500"
                >
                  <path
                    d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z"
                  />
                </svg>
              </button>
            </div>
          </div>

          <button
            class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            @click="addOutput"
          >
            <svg
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="currentColor"
              class="h-3.5 w-3.5"
            >
              <path d="M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z" />
            </svg>
            <span>添加输出</span>
          </button>
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

      <!-- 上次运行 Tab -->
      <div v-else-if="activeTab === 'lastRun'" class="of-panel-shell-body-inner">
        <NodeDebugLastRun
          :result="nodeDebugResult"
          :loading="nodeDebugStore.runningNodeId === uiStore.selectedNodeId"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useWorkflowEditorUIStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor-ui.store'
import { useWorkflowEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor.store'
import { useVariableSelectorStore } from '@renderer/stores/orchestraflow/workflow-editor/variable-selector/variable-selector.store'
import { useNodeDebugStore } from '@renderer/stores/orchestraflow/node-debug/node-debug.store'
import NodeDebugForm from './NodeDebug/NodeDebugForm.vue'
import NodeDebugLastRun from './NodeDebug/NodeDebugLastRun.vue'
import CapsuleTooltip from './components/CapsuleTooltip.vue'
import type { OFEndNodeData, OFVarType } from '@shared/Orchestraflow-types'
import type { NodeDebugField } from './NodeDebug/NodeDebugForm.vue'
import { OF_PANEL_THEME } from './panel-theme'

const uiStore = useWorkflowEditorUIStore()
const editorStore = useWorkflowEditorStore()
const variableSelectorStore = useVariableSelectorStore()
const nodeDebugStore = useNodeDebugStore()

// 本地表单状态（临时性质，不做全局状态）
const localTitle = ref('')
const localDesc = ref('')
const activeTab = ref<'settings' | 'lastRun'>('settings')
const debugMode = ref(false)
const theme = OF_PANEL_THEME.end

// 获取当前选中的节点
const currentNode = computed(() => {
  if (!uiStore.selectedNodeId) return null
  return editorStore.findNodeById(uiStore.selectedNodeId)
})

// 输出变量（从 store 读写，全局持久化）
const localOutputs = computed({
  get() {
    if (!currentNode.value) return []
    const nodeData = currentNode.value.data as OFEndNodeData
    return nodeData.output?.variables || []
  },
  set(
    newOutputs: Array<{
      variable: string
      value_selector?: string[]
      type?: OFVarType
      label?: string
    }>
  ) {
    if (!uiStore.selectedNodeId) return
    editorStore.updateNode(uiStore.selectedNodeId, {
      output: { variables: newOutputs }
    } as any)
  }
})

const debugFields = computed<NodeDebugField[]>(() => {
  const fieldMap = new Map<string, NodeDebugField>()
  for (const output of localOutputs.value) {
    const selector = output.value_selector || []
    if (selector.length === 0) continue
    const key = selector[0]
    if (!key || fieldMap.has(key)) continue
    fieldMap.set(key, {
      key,
      label: selector[selector.length - 1] || key,
      type: output.type,
      required: false,
      placeholder: `请输入 ${selector.join('.')}`
    })
  }
  return [...fieldMap.values()]
})

const debugFormValues = computed(() => {
  const nodeId = uiStore.selectedNodeId
  if (!nodeId) return {}
  return nodeDebugStore.getNodeFormValues(nodeId)
})

const nodeDebugResult = computed(() => {
  const nodeId = uiStore.selectedNodeId
  if (!nodeId) return undefined
  return nodeDebugStore.getLastRun(nodeId)
})

// Tab 切换
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

// 添加输出
function addOutput() {
  const newOutputs = [
    ...localOutputs.value,
    {
      variable: '',
      value_selector: [],
      type: 'string' as OFVarType
    }
  ]
  localOutputs.value = newOutputs
}

// 移除输出
function removeOutput(index: number) {
  const newOutputs = [...localOutputs.value]
  newOutputs.splice(index, 1)
  localOutputs.value = newOutputs
}

// 更新输出变量名
function updateOutputVariable(index: number, newVariable: string) {
  const newOutputs = [...localOutputs.value]
  newOutputs[index] = { ...newOutputs[index], variable: newVariable }
  localOutputs.value = newOutputs
}

function updateOutputLabel(index: number, newLabel: string) {
  const newOutputs = [...localOutputs.value]
  newOutputs[index] = { ...newOutputs[index], label: newLabel }
  localOutputs.value = newOutputs
}

function openOutputVariableSelector(event: MouseEvent) {
  const anchorRect =
    (event.currentTarget as HTMLElement | null)?.getBoundingClientRect() || undefined
  variableSelectorStore.openSelector(uiStore.selectedNodeId!, 'output', anchorRect, undefined, {
    x: event.clientX,
    y: event.clientY
  })
}

// 关闭面板
function handleClose() {
  uiStore.closeNodeConfigPanel()
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
  try {
    await nodeDebugStore.runNodeDebug({
      workflowId: editorStore.currentWorkflowId,
      nodeId: uiStore.selectedNodeId,
      inputs: { ...values },
      scopePath: editorStore.getNodeAncestorPath(uiStore.selectedNodeId)
    })
  } catch (error) {
    console.error('Node debug run failed:', error)
  }
}

// 监听选中节点变化，加载数据
watch(
  () => uiStore.selectedNodeId,
  (newId) => {
    debugMode.value = false
    if (newId && currentNode.value) {
      const nodeData = currentNode.value.data as OFEndNodeData
      localTitle.value = nodeData.title || '结束'
      localDesc.value = nodeData.desc || ''
      // 输出已通过 computed 自动同步
    }
  },
  { immediate: true }
)

// 监听变量选择事件
function handleVariableSelect(event: CustomEvent) {
  const { nodeId, targetType, variable } = event.detail

  // 确保是当前节点的 output 类型
  if (nodeId !== uiStore.selectedNodeId || targetType !== 'output') return

  // 只取变量名本身，不要前缀（如 "outputs.response" -> "response"）
  // 用户输入什么就记录什么
  const varName = variable.variable.split('.').pop() || variable.variable

  // 添加选中的变量到输出列表
  const newOutputs = [
    ...localOutputs.value,
    {
      variable: varName,
      label: variable.label || varName,
      value_selector: variable.valueSelector,
      type: variable.type as OFVarType | undefined,
      schema: variable.schema || null
    }
  ]
  localOutputs.value = newOutputs
}

onMounted(() => {
  window.addEventListener('of:variable-select', handleVariableSelect as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('of:variable-select', handleVariableSelect as EventListener)
})
</script>

<style scoped src="../../../styles/node-panel.scss"></style>
