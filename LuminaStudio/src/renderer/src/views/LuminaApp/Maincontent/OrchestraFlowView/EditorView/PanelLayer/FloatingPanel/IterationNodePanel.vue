<template>
  <div class="of-iteration-node-panel-b71 flex h-full flex-col">
    <div class="border-b border-gray-100 px-4 pb-4 pt-4">
      <div class="flex items-center gap-3">
        <div
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white"
          :class="theme.iconBgClass"
        >
          <svg
            viewBox="0 0 24 24"
            class="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
          >
            <path
              d="M20 11A8 8 0 1 0 6.062 16.938M20 11V4m0 7h-7M4 13a8 8 0 0 0 13.938 5.938M4 13v7m0-7h7"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <input
          v-model="localTitle"
          class="h-8 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 text-lg font-semibold text-gray-900 outline-none"
          placeholder="添加标题..."
        />
      </div>
      <textarea
        v-model="localDesc"
        class="mt-2 h-[42px] w-full resize-none rounded-md border border-transparent bg-transparent text-xs leading-[18px] text-gray-600 outline-none placeholder:text-gray-400"
        placeholder="添加描述..."
      />
    </div>

    <div class="flex-1 space-y-4 overflow-y-auto px-4 py-4">
      <section class="space-y-2">
        <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">迭代设置</div>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            class="rounded-xl border px-3 py-2 text-left text-sm transition-colors"
            :class="
              localMode === 'fixed-count'
                ? 'border-cyan-200 bg-cyan-50 text-cyan-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-cyan-200'
            "
            @click="setMode('fixed-count')"
          >
            固定轮数
          </button>
          <button
            type="button"
            class="rounded-xl border px-3 py-2 text-left text-sm transition-colors"
            :class="
              localMode === 'mock-source'
                ? 'border-cyan-200 bg-cyan-50 text-cyan-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-cyan-200'
            "
            @click="setMode('mock-source')"
          >
            Mock Source
          </button>
        </div>

        <label class="block">
          <div class="mb-1 text-xs text-gray-500">迭代次数</div>
          <input
            v-model.number="localIterationCount"
            type="number"
            min="1"
            max="20"
            class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none transition-colors focus:border-cyan-300"
          />
        </label>

        <label class="block">
          <div class="mb-1 text-xs text-gray-500">Mock 模板</div>
          <select
            v-model="localMockTemplateId"
            class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition-colors focus:border-cyan-300"
          >
            <option v-for="option in mockTemplateOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
      </section>

      <section class="space-y-2">
        <div class="flex items-center justify-between">
          <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">内部预览</div>
          <div
            class="rounded-full border px-2 py-0.5 text-[10px] font-medium"
            :class="theme.softBadgeClass"
          >
            {{ previewLabel }}
          </div>
        </div>

        <div class="rounded-2xl border border-gray-200 bg-[#f4f5f7] p-3">
          <div class="space-y-2">
            <div
              v-for="node in configStore.config.preview.nodes"
              :key="node.id"
              class="rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm"
            >
              <div class="text-sm font-medium text-gray-800">{{ node.title }}</div>
              <div v-if="node.subtitle" class="mt-1 text-xs text-gray-500">{{ node.subtitle }}</div>
            </div>
          </div>
        </div>
      </section>

      <section class="space-y-2">
        <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">模拟结果</div>
        <div class="rounded-2xl border border-gray-200 bg-white p-3">
          <div class="space-y-2">
            <div
              v-for="item in configStore.config.mockRun.iterations"
              :key="item.index"
              class="rounded-xl bg-gray-50 px-3 py-2"
            >
              <div class="flex items-center justify-between">
                <div class="text-sm font-medium text-gray-700">{{ item.title }}</div>
                <div class="text-xs text-cyan-600">第 {{ item.index }} 轮</div>
              </div>
              <div class="mt-1 text-xs text-gray-500">{{ item.outputSummary }}</div>
            </div>
          </div>

          <div class="mt-3 rounded-xl bg-cyan-50 px-3 py-2">
            <div class="text-xs font-medium uppercase text-cyan-700">最终输出</div>
            <div class="mt-1 text-sm text-cyan-900">
              {{ configStore.config.mockRun.finalOutput }}
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { OFIterationMode, OFIterationNodeData } from '@shared/Orchestraflow-types'
import { useWorkflowEditorUIStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor-ui.store'
import { useWorkflowEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor.store'
import { useIterationNodeConfigStore } from '@renderer/stores/orchestraflow/workflow-editor/node-config/iteration-node-config/iteration-node-config.store'
import { OF_PANEL_THEME } from './panel-theme'

const uiStore = useWorkflowEditorUIStore()
const editorStore = useWorkflowEditorStore()
const configStore = useIterationNodeConfigStore()
const theme = OF_PANEL_THEME.iteration

const mockTemplateOptions = [
  { value: 'llm-summary', label: 'LLM 总结循环' },
  { value: 'research-pass', label: 'Research Pass' },
  { value: 'draft-refine', label: 'Draft Refine' }
]

const currentNode = computed(() => {
  if (!uiStore.selectedNodeId) return null
  return editorStore.nodes.find((node) => node.id === uiStore.selectedNodeId) || null
})

const localTitle = ref('')
const localDesc = ref('')
const localMode = ref<OFIterationMode>('fixed-count')
const localIterationCount = ref(3)
const localMockTemplateId = ref('llm-summary')

const previewLabel = computed(
  () => `${localIterationCount.value} 轮 / ${localMockTemplateId.value}`
)

function patchNode(patch: Partial<OFIterationNodeData>) {
  if (!uiStore.selectedNodeId) return
  editorStore.updateNode(uiStore.selectedNodeId, patch)
}

function setMode(mode: OFIterationMode) {
  localMode.value = mode
  patchNode({ iterationMode: mode } as Partial<OFIterationNodeData>)
}

watch(
  () => uiStore.selectedNodeId,
  () => {
    if (!currentNode.value || currentNode.value.data.type !== 'iteration') return
    const nodeData = currentNode.value.data as OFIterationNodeData
    configStore.loadConfig(currentNode.value.id, {
      ...nodeData,
      nodeId: currentNode.value.id
    })
    localTitle.value = nodeData.title || '迭代'
    localDesc.value = nodeData.desc || ''
    localMode.value = nodeData.iterationMode
    localIterationCount.value = nodeData.iterationCount
    localMockTemplateId.value = nodeData.mockTemplateId
  },
  { immediate: true }
)

watch(localTitle, (value) => {
  if (!currentNode.value) return
  configStore.patchConfig({ title: value })
  patchNode({ title: value } as Partial<OFIterationNodeData>)
})

watch(localDesc, (value) => {
  if (!currentNode.value) return
  configStore.patchConfig({ desc: value })
  patchNode({ desc: value } as Partial<OFIterationNodeData>)
})

watch(localIterationCount, (value) => {
  if (!currentNode.value) return
  const safeCount = Math.max(1, Number(value || 1))
  configStore.patchConfig({ iterationCount: safeCount })
  patchNode({ iterationCount: safeCount } as Partial<OFIterationNodeData>)
})

watch(localMockTemplateId, (value) => {
  if (!currentNode.value) return
  configStore.patchConfig({ mockTemplateId: value })
  patchNode({ mockTemplateId: value } as Partial<OFIterationNodeData>)
})
</script>
