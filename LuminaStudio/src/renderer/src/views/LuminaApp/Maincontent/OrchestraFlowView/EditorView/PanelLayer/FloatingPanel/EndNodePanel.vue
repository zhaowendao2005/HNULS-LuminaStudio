<template>
  <div class="of-node-config-panel of-end-panel h-full flex flex-col">
    <!-- 头部 -->
    <div class="px-4 pt-4 pb-2 flex-shrink-0 border-b border-gray-100">
      <!-- 标题行：图标 + 输入框 + 操作按钮 -->
      <div class="flex items-center gap-3">
        <!-- 节点图标 -->
        <div
          class="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-500 text-white shrink-0"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            class="w-3.5 h-3.5"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M6.67315 1.18094C6.87691 1.0639 7.12769 1.06475 7.33067 1.18315L10.8307 3.22481C11.0323 3.34242 11.1562 3.55826 11.1562 3.79167C11.1562 4.02507 11.0323 4.24091 10.8307 4.35852L7.65625 6.21026V9.91667C7.65625 10.2791 7.36244 10.5729 7 10.5729C6.63756 10.5729 6.34375 10.2791 6.34375 9.91667V5.84577C6.34361 5.83788 6.34361 5.83 6.34375 5.82213V1.75C6.34375 1.51502 6.46939 1.29797 6.67315 1.18094ZM7.65625 4.69078L9.19758 3.79167L7.65625 2.89256V4.69078Z"
              fill="currentColor"
            />
          </svg>
        </div>

        <!-- 标题输入框 -->
        <input
          v-model="localTitle"
          class="system-xl-semibold flex-1 h-7 min-w-0 appearance-none rounded-md border border-transparent bg-transparent px-1 text-gray-900 outline-none focus:shadow-xs"
          placeholder="添加标题..."
        />

        <!-- 操作按钮 -->
        <div class="flex items-center gap-1 shrink-0">
          <!-- 文档链接 -->
          <a
            href="https://docs.dify.ai/zh/use-dify/nodes/end"
            target="_blank"
            class="flex h-6 w-6 items-center justify-center rounded-md hover:bg-gray-100"
          >
            <svg
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="currentColor"
              class="h-4 w-4 text-gray-400"
            >
              <path
                d="M13 21V23H11V21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H9C10.1947 3 11.2671 3.52375 12 4.35418C12.7329 3.52375 13.8053 3 15 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H13ZM20 19V5H15C13.8954 5 13 5.89543 13 7V19H20ZM11 19V7C11 5.89543 10.1046 5 9 5H4V19H11Z"
              />
            </svg>
          </a>
          <!-- 三点菜单 -->
          <div
            class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md hover:bg-gray-100"
          >
            <svg
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="currentColor"
              class="h-4 w-4 text-gray-400"
            >
              <path
                d="M5 10C3.9 10 3 10.9 3 12C3 13.1 3.9 14 5 14C6.1 14 7 13.1 7 12C7 10.9 6.1 10 5 10ZM19 10C17.9 10 17 10.9 17 12C17 13.1 17.9 14 19 14C20.1 14 21 13.1 21 12C21 10.9 20.1 10 19 10ZM12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10Z"
              />
            </svg>
          </div>
          <!-- 关闭按钮 -->
          <div class="flex h-6 w-6 cursor-pointer items-center justify-center" @click="handleClose">
            <svg
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="currentColor"
              class="h-4 w-4 text-gray-400"
            >
              <path
                d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.0502 5.63672L11.9997 10.5865Z"
              />
            </svg>
          </div>
        </div>
      </div>

      <!-- 描述文本框 -->
      <div class="mt-2">
        <textarea
          v-model="localDesc"
          class="w-full resize-none appearance-none bg-transparent text-xs leading-[18px] text-gray-600 outline-none placeholder:text-gray-400"
          placeholder="添加描述..."
          :style="{ height: '18px' }"
        />
      </div>

      <!-- Tab 切换 -->
      <div class="flex items-center justify-between mt-3">
        <div class="flex gap-4">
          <div
            class="system-md-semibold relative flex cursor-pointer items-center border-b-2 pb-2 pt-2.5"
            :class="
              activeTab === 'settings'
                ? 'border-amber-500 text-gray-900'
                : 'border-transparent text-gray-400'
            "
            @click="setActiveTab('settings')"
          >
            设置
          </div>
          <div
            class="system-md-semibold relative flex cursor-pointer items-center border-b-2 pb-2 pt-2.5"
            :class="
              activeTab === 'lastRun'
                ? 'border-amber-500 text-gray-900'
                : 'border-transparent text-gray-400'
            "
            @click="setActiveTab('lastRun')"
          >
            上次运行
          </div>
        </div>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="flex-1 overflow-y-auto">
      <!-- 设置 Tab -->
      <div v-if="activeTab === 'settings'" class="mt-2 px-4 pb-4 space-y-4">
        <!-- 输出变量 -->
        <div>
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="system-sm-semibold-uppercase text-gray-500">
                输出变量
                <span class="text-red-500">*</span>
              </div>
            </div>
            <div class="flex">
              <!-- 引用变量按钮 -->
              <div
                class="cursor-pointer select-none rounded-md p-1 hover:bg-gray-100"
                title="引用变量"
                @click="variableSelectorStore.openSelector(uiStore.selectedNodeId!, 'output')"
              >
                <svg
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="currentColor"
                  class="h-4 w-4 text-gray-400"
                >
                  <path
                    d="M14.6 16.6L19.2 12L14.6 7.4L16 6L22 12L16 18L14.6 16.6ZM9.4 16.6L4.8 12L9.4 7.4L8 6L2 12L8 18L9.4 16.6Z"
                  />
                </svg>
              </div>
              <!-- 添加按钮 -->
              <div
                class="cursor-pointer select-none rounded-md p-1 hover:bg-gray-100"
                @click="addOutput"
              >
                <svg
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="currentColor"
                  class="h-4 w-4 text-gray-400"
                >
                  <path d="M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z" />
                </svg>
              </div>
            </div>
          </div>

          <div class="mt-1 space-y-2">
            <div
              v-for="(output, index) in localOutputs"
              :key="index"
              class="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 group"
            >
              <!-- 变量图标 -->
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                class="h-3.5 w-3.5 text-emerald-500 shrink-0"
              >
                <path
                  d="M13.9986 8.76189C14.6132 8.04115 15.5117 7.625 16.459 7.625H16.5486C17.1009 7.625 17.5486 8.07272 17.5486 8.625C17.5486 9.17728 17.1009 9.625 16.5486 9.625H16.459C16.0994 9.625 15.7564 9.78289 15.5205 10.0595L13.1804 12.8039L13.9213 15.4107C13.9372 15.4666 13.9859 15.5 14.0355 15.5H15.4296C15.9819 15.5 16.4296 15.9477 16.4296 16.5C16.4296 17.0523 15.9819 17.5 15.4296 17.5H14.0355C13.0858 17.5 12.2562 16.8674 11.9975 15.9575L11.621 14.6328L10.1457 16.3631C9.5311 17.0839 8.63257 17.5 7.68532 17.5H7.59564C7.04336 17.5 6.59564 17.0523 6.59564 16.5C6.59564 15.9477 7.04336 15.5 7.59564 15.5H7.68532C8.04487 15.5 8.38789 15.3421 8.62379 15.0655L10.964 12.3209L10.2231 9.71433C10.2072 9.65839 10.1586 9.625 10.1089 9.625H8.71484C8.16256 9.625 7.71484 9.17728 7.71484 8.625C7.71484 8.07272 8.16256 7.625 8.71484 7.625H10.1089C11.0586 7.625 11.8883 8.25756 12.1469 9.16754L12.5234 10.4921L13.9986 8.76189Z"
                  fill="currentColor"
                />
                <path
                  d="M5.429 3C3.61372 3 2.143 4.47071 2.143 6.286V10.4428L1.29289 11.2929C1.10536 11.4804 1 11.7348 1 12C1 12.2652 1.10536 12.5196 1.29289 12.7071L2.143 13.5572V17.714C2.143 19.5293 3.61372 21 5.429 21C5.98128 21 6.429 20.5523 6.429 20C6.429 19.4477 5.98128 19 5.429 19C4.71828 19 4.143 18.4247 4.143 17.714V13.143C4.143 12.8778 4.03764 12.6234 3.85011 12.4359L3.41421 12L3.85011 11.5641C4.03764 11.3766 4.143 11.1222 4.143 10.857V6.286C4.143 5.57528 4.71828 5 5.429 5C5.98128 5 6.429 4.55228 6.429 4C6.429 3.44772 5.98128 3 5.429 3Z"
                  fill="currentColor"
                />
                <path
                  d="M18.5708 3C18.0185 3 17.5708 3.44772 17.5708 4C17.5708 4.55228 18.0185 5 18.5708 5C19.2815 5 19.8568 5.57529 19.8568 6.286V10.857C19.8568 11.1222 19.9622 11.3766 20.1497 11.5641L20.5856 12L20.1497 12.4359C19.9622 12.6234 19.8568 12.8778 19.8568 13.143V17.714C19.8568 18.4244 19.2808 19 18.5708 19C18.0185 19 17.5708 19.4477 17.5708 20C17.5708 20.5523 18.0185 21 18.5708 21C20.3848 21 21.8568 19.5296 21.8568 17.714V13.5572L22.7069 12.7071C23.0974 12.3166 23.0974 11.6834 22.7069 11.2929L21.8568 10.4428V6.286C21.8568 4.47071 20.3861 3 18.5708 3Z"
                  fill="currentColor"
                />
              </svg>

              <!-- 变量名输入 -->
              <div class="flex-1 min-w-0">
                <input
                  :value="output.variable"
                  class="w-full text-sm text-gray-700 bg-transparent outline-none"
                  placeholder="变量名"
                  @input="updateOutputVariable(index, ($event.target as HTMLInputElement).value)"
                />
              </div>

              <!-- 类型选择 -->
              <div class="text-gray-400 shrink-0">:</div>
              <div class="flex items-center gap-1 shrink-0">
                <div class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">string</div>
              </div>

              <!-- 删除按钮 -->
              <div
                class="cursor-pointer shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
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
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 上次运行 Tab -->
      <div v-else-if="activeTab === 'lastRun'" class="p-4">
        <div class="text-sm text-gray-400 text-center py-8">暂无运行记录</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useWorkflowEditorUIStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor-ui.store'
import { useWorkflowEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor.store'
import { useVariableSelectorStore } from '@renderer/stores/orchestraflow/workflow-editor/variable-selector/variable-selector.store'
import type { OFEndNodeData } from '@shared/Orchestraflow-types'

const uiStore = useWorkflowEditorUIStore()
const editorStore = useWorkflowEditorStore()
const variableSelectorStore = useVariableSelectorStore()

// 本地表单状态（临时性质，不做全局状态）
const localTitle = ref('')
const localDesc = ref('')
const activeTab = ref<'settings' | 'lastRun'>('settings')

// 获取当前选中的节点
const currentNode = computed(() => {
  if (!uiStore.selectedNodeId) return null
  return editorStore.nodes.find((n) => n.id === uiStore.selectedNodeId)
})

// 输出变量（从 store 读写，全局持久化）
const localOutputs = computed({
  get() {
    if (!currentNode.value) return []
    const nodeData = currentNode.value.data as OFEndNodeData
    return nodeData.outputs || []
  },
  set(newOutputs: Array<{ variable: string; value_selector: string[] }>) {
    if (!uiStore.selectedNodeId) return
    editorStore.updateNode(uiStore.selectedNodeId, {
      outputs: newOutputs
    })
  }
})

// Tab 切换
function setActiveTab(tab: 'settings' | 'lastRun') {
  activeTab.value = tab
}

// 添加输出
function addOutput() {
  const newOutputs = [
    ...localOutputs.value,
    {
      variable: '',
      value_selector: []
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

// 关闭面板
function handleClose() {
  uiStore.closeNodeConfigPanel()
}

// 监听选中节点变化，加载数据
watch(
  () => uiStore.selectedNodeId,
  (newId) => {
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

  // 添加选中的变量到输出列表
  const newOutputs = [
    ...localOutputs.value,
    {
      variable: variable.variable,
      value_selector: variable.valueSelector
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

<style scoped>
.of-node-config-panel {
  font-family: inherit;
}
</style>
