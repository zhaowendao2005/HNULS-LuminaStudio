<template>
  <div
    class="ls-mcp-workbench relative flex h-full flex-col overflow-hidden bg-white text-slate-900"
  >
    <div class="flex flex-1 overflow-hidden">
      <StageSidebar
        :tabs="tabs"
        :active-stage="store.state.activeStage"
        :get-tab-status-class="tabStatusClass"
        @change-stage="store.state.activeStage = $event"
      />

      <main class="flex min-w-0 flex-1 flex-col overflow-hidden">
        <ConnectStage
          v-if="store.state.activeStage === 'connect'"
          :draft="draft"
          :state="store.state"
          :transport-options="transportOptions"
          @update:draft="updateDraft"
          @reset-draft="resetDraft"
          @save-preset="handleSavePreset"
          @connect-draft="connectDraft"
          @disconnect="store.disconnect"
          @load-preset="loadPreset"
          @connect-preset="store.connectPreset"
          @delete-preset="store.deletePreset"
        />

        <ToolsStage
          v-else-if="store.state.activeStage === 'tools'"
          :state="store.state"
          :active-tool="store.activeTool"
          :right-panel-width="rightPanelWidth"
          :is-dragging="isDragging"
          :tool-prompt-preview="toolPromptPreview"
          :tool-hint="toolHint"
          @select-tool="store.state.selectedToolName = $event"
          @change-tools-mode="store.state.toolsMode = $event"
          @start-resize="startResize"
        />

        <PromptsStage
          v-else-if="store.state.activeStage === 'prompts'"
          :prompt-args="promptArgs"
          :state="store.state"
          :active-prompt="store.activePrompt"
          @update:prompt-args="updatePromptArgs"
          @select-prompt="selectPrompt"
          @change-prompts-mode="store.state.promptsMode = $event"
          @render-prompt="store.renderPrompt(promptArgs)"
        />

        <ResourcesStage
          v-else-if="store.state.activeStage === 'resources'"
          :state="store.state"
          :active-resource="store.activeResource"
          @select-resource="selectResource"
          @change-resources-mode="store.state.resourcesMode = $event"
          @load-resource="store.loadResource"
        />

        <ExecuteStage
          v-else
          :tool-args="toolArgs"
          :raw-tool-args="rawToolArgs"
          :state="store.state"
          :active-tool="store.activeTool"
          :visual-tool-fields="visualToolFields"
          :boolean-options="booleanOptions"
          @update:tool-args="updateToolArgs"
          @update:raw-tool-args="updateRawToolArgs"
          @execute-tool="executeTool"
        />
      </main>
    </div>

    <TracePanel
      :is-open="store.state.rawTraceOpen"
      :outgoing-trace="outgoingTrace"
      :incoming-trace="incomingTrace"
      @toggle="store.state.rawTraceOpen = !store.state.rawTraceOpen"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { McpServerPreset } from '@preload/types'
import { type WhiteSelectOption } from '@renderer/components/WhiteSelect/index.vue'
import { useMcpStore } from '@renderer/stores/mcp/store'
import type { McpPresetDraft, McpStage } from '@renderer/stores/mcp/types'
import ConnectStage from './components/ConnectStage/index.vue'
import ExecuteStage from './components/ExecuteStage/index.vue'
import PromptsStage from './components/PromptsStage/index.vue'
import ResourcesStage from './components/ResourcesStage/index.vue'
import StageSidebar from './components/StageSidebar/index.vue'
import ToolsStage from './components/ToolsStage/index.vue'
import TracePanel from './components/TracePanel/index.vue'

interface StageTabItem {
  id: McpStage
  num: string
  label: string
}

interface VisualToolField {
  name: string
  required: boolean
  description: string
  kind: 'enum' | 'boolean' | 'number' | 'json' | 'string'
  options: string[]
}

const store = useMcpStore()

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const tabs: readonly StageTabItem[] = [
  { id: 'connect', num: '①', label: '连接 & 能力协商' },
  { id: 'tools', num: '②', label: '工具清单 & Schema' },
  { id: 'prompts', num: '③', label: 'Prompts & 上下文' },
  { id: 'resources', num: '④', label: 'Resources & 数据' },
  { id: 'execute', num: '⑤', label: '工具执行 & 响应' }
]

const transportOptions: Array<WhiteSelectOption<string>> = [
  { label: 'STDIO', value: 'stdio' },
  { label: 'Streamable HTTP', value: 'streamable-http' }
]

// WhiteSelect 目前的 value 类型是 string | number，所以 boolean 在这里先用字符串承载，
// 后续会在 normalizeToolArgsFromVisual() 里统一转换成真正的 boolean。
const booleanOptions: Array<WhiteSelectOption<string>> = [
  { label: 'true', value: 'true' },
  { label: 'false', value: 'false' }
]

const rightPanelWidth = ref(380)
const isDragging = ref(false)

function startResize(e: MouseEvent): void {
  isDragging.value = true
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'

  const startX = e.clientX
  const startWidth = rightPanelWidth.value

  const onMouseMove = (moveEvent: MouseEvent): void => {
    const delta = startX - moveEvent.clientX
    const newWidth = Math.max(280, Math.min(600, startWidth + delta))
    rightPanelWidth.value = newWidth
  }

  const onMouseUp = (): void => {
    isDragging.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

// 草稿对象继续留在父层，子组件只负责展示和分发交互。
const draft = reactive<McpPresetDraft>({ ...store.defaultStdioDraft })
const promptArgs = reactive<Record<string, string>>({})
const toolArgs = reactive<Record<string, string>>({})

const rawToolArgs = computed({
  get: () => JSON.stringify(normalizeToolArgsFromVisual(), null, 2),
  set: (value: string) => {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>
      Object.keys(toolArgs).forEach((key) => delete toolArgs[key])
      Object.entries(parsed).forEach(([key, val]) => {
        toolArgs[key] = typeof val === 'string' ? val : JSON.stringify(val)
      })
    } catch {
      // 这里保持输入宽松，避免用户输入半截 JSON 时被强制打断。
    }
  }
})

const toolPromptPreview = computed(() => {
  const tool = store.activeTool
  if (!tool) return 'No tool selected.'

  const properties =
    (tool.inputSchema?.properties as Record<string, { description?: string }> | undefined) ?? {}
  const required = Array.isArray(tool.inputSchema?.required) ? tool.inputSchema.required : []
  const lines = Object.keys(properties).map((key) => {
    const mode = required.includes(key) ? 'required' : 'optional'
    return `- ${key} (${mode}): ${properties[key]?.description || 'No description'}`
  })

  return [
    `Tool: ${tool.name}`,
    `Description: ${tool.description || 'No description'}`,
    '',
    'Arguments:',
    ...lines
  ].join('\n')
})

const toolHint = computed(() => {
  const description = store.activeTool?.description || ''
  return description.length < 24
    ? '工具描述较短，建议补充使用场景与返回值语义，以提升模型调用命中率。'
    : '当前描述长度可接受，优先检查参数字段说明是否覆盖调用前置条件。'
})

const incomingTrace = computed(() =>
  store.state.traces.filter((item) => item.direction === 'incoming')
)

const outgoingTrace = computed(() =>
  store.state.traces.filter((item) => item.direction === 'outgoing')
)

const visualToolFields = computed<VisualToolField[]>(() => {
  const schema = store.activeTool?.inputSchema
  const properties =
    (schema?.properties as Record<string, Record<string, unknown>> | undefined) ?? {}
  const required = Array.isArray(schema?.required) ? schema.required : []

  return Object.entries(properties).map(([name, field]) => ({
    name,
    required: required.includes(name),
    description: typeof field.description === 'string' ? field.description : '',
    kind: Array.isArray(field.enum)
      ? 'enum'
      : field.type === 'boolean'
        ? 'boolean'
        : field.type === 'number' || field.type === 'integer'
          ? 'number'
          : field.type === 'object' || field.type === 'array'
            ? 'json'
            : 'string',
    options: Array.isArray(field.enum) ? field.enum.map(String) : []
  }))
})

onMounted(() => {
  store.initialize()
})

function resetDraft(): void {
  Object.assign(draft, { ...store.defaultStdioDraft, id: '' })
}

function updateDraft(nextDraft: McpPresetDraft): void {
  Object.assign(draft, nextDraft)
}

function loadPreset(preset: McpServerPreset): void {
  if (preset.transport === 'stdio') {
    Object.assign(draft, {
      id: preset.id,
      name: preset.name,
      transport: 'stdio',
      command: preset.command,
      argsText: preset.args.join(' '),
      cwd: preset.cwd || '',
      envText: JSON.stringify(preset.env || {}, null, 2)
    })
    return
  }

  Object.assign(draft, {
    id: preset.id,
    name: preset.name,
    transport: 'streamable-http',
    url: preset.url,
    headersText: JSON.stringify(preset.headers || {}, null, 2)
  })
}

async function handleSavePreset(): Promise<void> {
  const preset = serializeDraft()
  await store.savePreset(preset)
}

async function connectDraft(): Promise<void> {
  const preset = serializeDraft()
  await store.savePreset(preset)
  await store.connectPreset(preset.id)
}

function serializeDraft(): McpServerPreset {
  if (draft.transport === 'stdio') {
    return {
      id: draft.id || makeId(),
      name: draft.name,
      transport: 'stdio',
      command: draft.command,
      args: draft.argsText.split(/\s+/).filter(Boolean),
      cwd: draft.cwd || undefined,
      env: draft.envText.trim() ? JSON.parse(draft.envText) : {}
    }
  }

  return {
    id: draft.id || makeId(),
    name: draft.name,
    transport: 'streamable-http',
    url: draft.url,
    headers: draft.headersText.trim() ? JSON.parse(draft.headersText) : {}
  }
}

function selectPrompt(name: string): void {
  store.state.selectedPromptName = name
  Object.keys(promptArgs).forEach((key) => delete promptArgs[key])
}

function updatePromptArgs(nextPromptArgs: Record<string, string>): void {
  Object.keys(promptArgs).forEach((key) => delete promptArgs[key])
  Object.entries(nextPromptArgs).forEach(([key, value]) => {
    promptArgs[key] = value
  })
}

function selectResource(uri: string): void {
  store.state.selectedResourceUri = uri
}

function normalizeToolArgsFromVisual(): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  visualToolFields.value.forEach((field) => {
    const raw = toolArgs[field.name]
    if (raw === undefined || raw === '') return

    if (field.kind === 'boolean') {
      result[field.name] = raw === 'true'
      return
    }

    if (field.kind === 'number') {
      result[field.name] = Number(raw)
      return
    }

    if (field.kind === 'json') {
      result[field.name] = JSON.parse(raw)
      return
    }

    result[field.name] = raw
  })

  return result
}

function updateToolArgs(nextToolArgs: Record<string, string>): void {
  Object.keys(toolArgs).forEach((key) => delete toolArgs[key])
  Object.entries(nextToolArgs).forEach(([key, value]) => {
    toolArgs[key] = value
  })
}

function updateRawToolArgs(value: string): void {
  rawToolArgs.value = value
}

async function executeTool(): Promise<void> {
  const payload = rawToolArgs.value.trim() ? JSON.parse(rawToolArgs.value) : {}
  await store.runTool(payload)
}

function tabStatusClass(tabId: string): string {
  if (tabId === 'connect') {
    return store.state.session.connected ? 'bg-emerald-500' : 'bg-slate-300'
  }

  if (!store.state.session.connected) {
    return 'bg-slate-200'
  }

  return 'bg-emerald-500'
}
</script>
