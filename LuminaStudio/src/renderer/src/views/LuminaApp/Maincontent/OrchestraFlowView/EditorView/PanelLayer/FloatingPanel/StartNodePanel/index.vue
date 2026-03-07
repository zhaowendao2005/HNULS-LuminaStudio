<template>
  <!-- Start 节点配置面板根容器，定位类 of-start-node-panel-xxx -->
  <div class="of-start-node-panel-2c9 h-full flex flex-col">
    <!-- 头部 -->
    <div class="px-4 pt-4 pb-2 flex-shrink-0 border-b border-gray-100">
      <!-- 标题行：图标 + 输入框 + 操作按钮 -->
      <div class="flex items-center gap-3">
        <!-- 节点图标 -->
        <div
          class="flex items-center justify-center w-6 h-6 rounded-lg text-white shrink-0"
          :class="theme.iconBgClass"
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
              d="M6.99999 2.44562C6.97241 2.46663 6.94086 2.49116 6.90151 2.52177L3.43971 5.21428C3.17896 5.41708 3.15115 5.44593 3.13396 5.46918C3.10759 5.50483 3.08794 5.545 3.07599 5.58771C3.0682 5.61555 3.0625 5.65522 3.0625 5.98554V9.67837C3.0625 9.97506 3.06301 10.1581 3.07422 10.2954C3.08463 10.4228 3.10101 10.4541 3.10219 10.4563C3.13714 10.5249 3.19296 10.5808 3.26156 10.6157C3.2638 10.6169 3.29514 10.6333 3.42254 10.6437C3.55984 10.6549 3.74289 10.6555 4.03958 10.6555H4.8125V7.53462C4.8125 7.52831 4.81249 7.52199 4.81249 7.51565C4.81247 7.38933 4.81245 7.25834 4.82163 7.14594C4.8319 7.02025 4.85685 6.86124 4.93966 6.69872C5.05151 6.4792 5.22998 6.30072 5.44951 6.18886C5.61203 6.10605 5.77104 6.08111 5.89673 6.07084C6.00913 6.06166 6.14012 6.06168 6.26644 6.0617C6.27278 6.0617 6.2791 6.06171 6.28541 6.06171H7.71458C7.72089 6.06171 7.72721 6.0617 7.73355 6.0617C7.85987 6.06168 7.99086 6.06166 8.10326 6.07084C8.22896 6.08111 8.38796 6.10605 8.55049 6.18886C8.77001 6.30072 8.94849 6.4792 9.06034 6.69872C9.14315 6.86124 9.16809 7.02025 9.17836 7.14594C9.18755 7.25834 9.18752 7.38933 9.1875 7.51565C9.1875 7.52199 9.1875 7.52831 9.1875 7.53462V10.6555H9.96041C10.2571 10.6555 10.4402 10.6549 10.5775 10.6437C10.7049 10.6333 10.7361 10.6169 10.7383 10.6158C10.8069 10.5808 10.8628 10.525 10.8978 10.4564C10.8989 10.4541 10.9154 10.4228 10.9258 10.2954C10.937 10.1581 10.9375 9.97506 10.9375 9.67837V5.98554C10.9375 5.65522 10.9318 5.61555 10.924 5.58771C10.912 5.545 10.8924 5.50483 10.866 5.46918C10.8488 5.44593 10.821 5.41708 10.5603 5.21428L7.09848 2.52177C7.05913 2.49116 7.02757 2.46663 6.99999 2.44562ZM9.98433 11.968C10.2497 11.968 10.4871 11.968 10.6843 11.9519C10.8951 11.9346 11.1172 11.8958 11.3343 11.7852C11.6499 11.6244 11.9064 11.3678 12.0672 11.0523C12.1778 10.8351 12.2167 10.6131 12.2339 10.4023C12.25 10.205 12.25 9.96764 12.25 9.70225L12.25 5.98554C12.25 5.9671 12.25 5.94866 12.2501 5.93025C12.2504 5.69307 12.2508 5.45861 12.1879 5.23392C12.1329 5.03748 12.0426 4.85272 11.9213 4.68871C11.7825 4.50112 11.5972 4.35747 11.4098 4.21216C11.3952 4.20087 11.3806 4.18958 11.3661 4.17826L7.90428 1.48574C7.89214 1.4763 7.87933 1.46621 7.86587 1.4556C7.73357 1.35131 7.53852 1.19755 7.3049 1.1343C7.10523 1.08023 6.89477 1.08023 6.69509 1.1343C6.46148 1.19755 6.26642 1.35131 6.13412 1.4556C6.12066 1.46621 6.10785 1.4763 6.09571 1.48574L2.63391 4.17826C2.61935 4.18958 2.60478 4.20088 2.59022 4.21216C2.40278 4.35747 2.21747 4.50112 2.07873 4.68871C1.95742 4.85271 1.86706 5.03748 1.81207 5.23392C1.74918 5.4586 1.74956 5.69307 1.74994 5.93024C1.74997 5.94866 1.75 5.96709 1.75 5.98554L1.75 9.70227C1.74998 9.96765 1.74997 10.205 1.76608 10.4023C1.78331 10.6131 1.82216 10.8351 1.93279 11.0523C2.09357 11.3678 2.35014 11.6244 2.6657 11.7852C2.88282 11.8958 3.10485 11.9346 3.31566 11.9519C3.5129 11.968 3.75029 11.968 4.01566 11.968H9.98433ZM7.875 10.6555V7.53462C7.875 7.47093 7.87498 7.41945 7.87447 7.37473C7.82975 7.37422 7.77828 7.37421 7.71458 7.37421H6.28541C6.22172 7.37421 6.17024 7.37422 6.12553 7.37473C6.12501 7.41945 6.125 7.47093 6.125 7.53462V10.6555H7.875Z"
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
          <!-- 帮助按钮 -->
          <CapsuleTooltip text="调试运行" placement="bottom">
            <div
              class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md hover:bg-gray-100"
              @click="enterDebugMode"
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
                  d="M8 18.3915V5.60846L18.2264 12L8 18.3915ZM6 3.80421V20.1957C6 20.9812 6.86395 21.46 7.53 21.0437L20.6432 12.848C21.2699 12.4563 21.2699 11.5436 20.6432 11.152L7.53 2.95621C6.86395 2.53993 6 3.01878 6 3.80421Z"
                />
              </svg>
            </div>
          </CapsuleTooltip>
          <!-- 文档链接 -->
          <CapsuleTooltip text="查看文档" placement="bottom">
            <a
              href="https://docs.dify.ai/zh/use-dify/nodes/user-input"
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
          </CapsuleTooltip>
          <!-- 三点菜单 -->
          <CapsuleTooltip text="更多操作" placement="bottom">
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
          </CapsuleTooltip>
          <!-- 关闭按钮 -->
          <CapsuleTooltip text="关闭面板" placement="bottom">
            <div
              class="flex h-6 w-6 cursor-pointer items-center justify-center"
              @click="handleClose"
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
                  d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.0502 5.63672L11.9997 10.5865Z"
                />
              </svg>
            </div>
          </CapsuleTooltip>
        </div>
      </div>

      <!-- 描述文本框：第一个标题之外的正文文案定位类 of-start-node-desc-1 -->
      <div class="mt-2 of-start-node-desc-1">
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
              activeTab === 'settings' ? theme.tabActiveClass : 'border-transparent text-gray-400'
            "
            @click="setActiveTab('settings')"
          >
            设置
          </div>
          <div
            class="system-md-semibold relative flex cursor-pointer items-center border-b-2 pb-2 pt-2.5"
            :class="
              activeTab === 'lastRun' ? theme.tabActiveClass : 'border-transparent text-gray-400'
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
      <div v-if="activeTab === 'settings' && !debugMode" class="mt-2 px-4 pb-4 space-y-4">
        <!-- 输入字段 -->
        <div>
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="system-sm-semibold-uppercase text-gray-500">输入字段</div>
            </div>
            <div class="flex">
              <div
                class="cursor-pointer select-none rounded-md p-1 hover:bg-gray-100"
                @click="handleAddFieldClick"
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

          <div class="mt-1 space-y-1">
            <div
              v-for="(field, index) in localInputs"
              :key="index"
              class="group relative flex h-8 cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-2.5 shadow-xs hover:shadow-md"
              @click="handleEditFieldClick(index)"
            >
              <div class="flex w-0 grow items-center space-x-1">
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
                <div class="max-w-[130px] shrink-0 truncate text-[13px] font-medium text-gray-600">
                  {{ field.variable }}
                </div>
                <div class="shrink-0 text-xs font-medium text-gray-400">·</div>
                <div class="max-w-[130px] truncate text-[13px] font-medium text-gray-400">
                  {{ field.type }}
                </div>
              </div>
              <!-- 操作按钮 -->
              <div class="ml-2 flex shrink-0 items-center">
                <div class="text-xs font-normal text-gray-400 mr-2">
                  {{ field.required ? '必填' : '可选' }}
                </div>
                <div class="cursor-pointer" @click.stop="removeInputField(index)">
                  <svg
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    fill="currentColor"
                    class="h-3.5 w-3.5 text-gray-400 hover:text-red-500"
                  >
                    <path
                      d="M2 4C2 3.44772 2.44772 3 3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4ZM4 5V19H20V5H4ZM7 8H17V11H15V10H13V14H14.5V16H9.5V14H11V10H9V11H7V8Z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'settings' && debugMode" class="mt-2 px-4 pb-4">
        <NodeDebugForm
          :fields="debugFields"
          :model-value="debugFormValues"
          :running="nodeDebugStore.runningNodeId === uiStore.selectedNodeId"
          @update:model-value="handleDebugFormUpdate"
          @execute="executeNodeDebug"
        />
      </div>

      <!-- 上次运行 Tab -->
      <div v-else-if="activeTab === 'lastRun'" class="p-4">
        <NodeDebugLastRun
          :result="nodeDebugResult"
          :loading="nodeDebugStore.runningNodeId === uiStore.selectedNodeId"
        />
      </div>
    </div>

    <!-- 底部：下一步 -->
    <div class="flex-shrink-0 border-t border-gray-100 p-4">
      <div class="system-sm-semibold-uppercase mb-1 flex items-center text-gray-500">下一步</div>
      <div class="system-xs-regular mb-2 text-gray-400">添加此工作流程中的下一个节点</div>

      <!-- 下一步节点连接器 -->
      <div class="flex py-1">
        <div
          class="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-xs"
        >
          <!-- 这里后续会显示已连接的节点 -->
        </div>
        <svg class="w-6 shrink-0" style="height: 36px">
          <g>
            <path d="M0,18 L24,18" stroke-width="1" fill="none" class="stroke-gray-200" />
          </g>
        </svg>
        <div
          class="grow flex h-9 cursor-pointer items-center rounded-lg border border-dashed border-gray-200 px-2 text-xs text-gray-400 hover:bg-gray-50"
          @click="addNextNode"
        >
          <div class="mr-1.5 flex h-5 w-5 items-center justify-center rounded bg-gray-100">
            <svg
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="currentColor"
              class="h-3 w-3"
            >
              <path d="M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z" />
            </svg>
          </div>
          <div class="flex items-center uppercase">添加节点</div>
        </div>
      </div>
    </div>
  </div>

  <!-- 添加字段对话框 -->
  <AddFieldDialog
    v-model="showAddFieldDialog"
    :initial-field="editingField"
    @confirm="handleFieldCreated"
  />
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import AddFieldDialog from './AddFieldDialog/index.vue'
import NodeDebugForm from '../NodeDebug/NodeDebugForm.vue'
import NodeDebugLastRun from '../NodeDebug/NodeDebugLastRun.vue'
import CapsuleTooltip from '../components/CapsuleTooltip.vue'
import {
  useWorkflowEditorUIStore,
  PanelTab
} from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor-ui.store'
import { useWorkflowEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor.store'
import { useNodeDebugStore } from '@renderer/stores/orchestraflow/node-debug/node-debug.store'
import { OFVarType, type OFStartNodeData, type OFVariable } from '@shared/Orchestraflow-types'
import type { NodeDebugField } from '../NodeDebug/NodeDebugForm.vue'
import { OF_PANEL_THEME } from '../panel-theme'

const uiStore = useWorkflowEditorUIStore()
const editorStore = useWorkflowEditorStore()
const nodeDebugStore = useNodeDebugStore()

// 本地表单状态（临时性质，不做全局状态）
const localTitle = ref('')
const localDesc = ref('')
const activeTab = ref<'settings' | 'lastRun'>('settings')
const debugMode = ref(false)
const showAddFieldDialog = ref(false)
const editingFieldIndex = ref<number | null>(null)
const theme = OF_PANEL_THEME.start

// 获取当前选中的节点
const currentNode = computed(() => {
  if (!uiStore.selectedNodeId) return null
  return editorStore.findNodeById(uiStore.selectedNodeId)
})

// 输入字段（从 store 读写，全局持久化）
const localInputs = computed({
  get() {
    if (!currentNode.value) return []
    const nodeData = currentNode.value.data as OFStartNodeData
    return nodeData.input?.variables || []
  },
  set(newInputs: OFVariable[]) {
    if (!uiStore.selectedNodeId) return
    editorStore.updateNode(uiStore.selectedNodeId, {
      input: { variables: newInputs }
    } as any)
  }
})

const debugFields = computed<NodeDebugField[]>(() =>
  localInputs.value.map((field) => ({
    key: field.variable,
    label: field.label || field.variable,
    type: field.type,
    required: field.required,
    placeholder: field.description || `请输入 ${field.label || field.variable}`
  }))
)

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

const editingField = computed<OFVariable | null>(() => {
  if (editingFieldIndex.value == null) return null
  return localInputs.value[editingFieldIndex.value] || null
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

// 点击“添加字段”按钮：打开对话框
function handleAddFieldClick() {
  editingFieldIndex.value = null
  showAddFieldDialog.value = true
}

function handleEditFieldClick(index: number) {
  editingFieldIndex.value = index
  showAddFieldDialog.value = true
}

// 对话框确认创建字段后回写到当前列表
function handleFieldCreated(payload: {
  name: string
  label: string
  type: OFVarType.String | OFVarType.Array
  required: boolean
  defaultValue?: string | string[]
}) {
  const nextField: OFVariable = {
    variable: payload.name,
    label: payload.label,
    type: payload.type,
    required: payload.required,
    default:
      payload.type === OFVarType.Array
        ? Array.isArray(payload.defaultValue)
          ? [...payload.defaultValue]
          : []
        : typeof payload.defaultValue === 'string'
          ? payload.defaultValue
          : ''
  }
  if (editingFieldIndex.value == null) {
    localInputs.value = [...localInputs.value, nextField]
  } else {
    const newInputs = [...localInputs.value]
    newInputs[editingFieldIndex.value] = nextField
    localInputs.value = newInputs
  }
  editingFieldIndex.value = null
}

// 移除输入字段
function removeInputField(index: number) {
  const newInputs = [...localInputs.value]
  newInputs.splice(index, 1)
  localInputs.value = newInputs
  if (editingFieldIndex.value === index) {
    editingFieldIndex.value = null
  }
}

// 添加下一步节点
function addNextNode() {
  // TODO: 实现添加节点逻辑
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

// 关闭面板
function handleClose() {
  uiStore.closeNodeConfigPanel()
}

// 监听选中节点变化，加载数据
watch(
  () => uiStore.selectedNodeId,
  (newId) => {
    debugMode.value = false
    editingFieldIndex.value = null
    if (newId && currentNode.value) {
      const nodeData = currentNode.value.data as OFStartNodeData
      localTitle.value = nodeData.title || '开始'
      localDesc.value = nodeData.desc || ''
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.of-start-node-panel-2c9 {
  font-family: inherit;
}
</style>
