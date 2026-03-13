<template>
  <div class="of-generate-design flex h-full flex-col bg-[#fcfcfd]">
    <div class="border-b border-gray-200 bg-white px-6 py-4">
      <div class="flex items-center justify-between gap-4 overflow-hidden">
        <div class="min-w-0 overflow-hidden">
          <div class="text-[13px] font-semibold text-gray-800">规划设计稿</div>
          <div class="mt-1 truncate text-xs leading-5 text-gray-500">
            当前会话：{{ sessionTitle }}
            <template v-if="activeDesignTitle">
              ，当前版本：{{ activeDesignTitle }} / V{{ activeDesignVersion }}
            </template>
          </div>
          <div v-if="activePlanningTitle" class="mt-1 truncate text-[11px] text-gray-400">
            来源快照：{{ activePlanningTitle }}
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <span class="rounded bg-gray-100 px-2 py-1 text-[10px] text-gray-500">
            设计稿 {{ designCount }} 份
          </span>
          <button
            type="button"
            :class="statusBadgeClass"
            :disabled="!canOpenDiagnostics"
            @click="handleOpenDiagnostics()"
          >
            {{ statusText }}
          </button>
          <button
            type="button"
            title="打开规划设计稿管理"
            class="rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            @click="$emit('open-design-manager')"
          >
            查看规划设计稿
          </button>
          <button
            type="button"
            title="打开 copilot"
            class="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 transition-colors hover:text-gray-800 disabled:cursor-not-allowed disabled:text-gray-300"
            :disabled="!hasActiveDesignDocument"
            @click="$emit('open-copilot')"
          >
            <MessageSquare :size="15" />
          </button>
          <button
            type="button"
            title="切换会话"
            class="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 transition-colors hover:text-gray-800"
            @click="$emit('open-sessions')"
          >
            <FolderKanban :size="15" />
          </button>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-6 py-5">
      <div class="mx-auto flex h-full max-w-6xl gap-6">
        <div class="flex min-h-0 flex-1 flex-col border border-gray-200 bg-white">
          <div
            class="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 px-4 py-2"
          >
            <div>
              <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">
                规划设计稿正文
              </div>
              <div class="mt-1 text-[11px] text-gray-400">
                在“快照视图 / 规划设计稿视图 / 诊断视图”之间切换当前版本内容。
              </div>
            </div>

            <div class="flex items-center gap-2">
              <div class="flex rounded border border-gray-200 bg-gray-100 p-0.5">
                <button
                  type="button"
                  :class="viewMode === 'snapshot' ? activeToolbarTabClass : toolbarTabClass"
                  @click="$emit('update:view-mode', 'snapshot')"
                >
                  快照视图
                </button>
                <button
                  type="button"
                  :class="[
                    viewMode === 'dsl' ? activeToolbarTabClass : toolbarTabClass,
                    !hasGeneratedDsl ? 'cursor-not-allowed text-gray-300 hover:text-gray-300' : ''
                  ]"
                  :disabled="!hasGeneratedDsl"
                  @click="$emit('update:view-mode', 'dsl')"
                >
                  规划设计稿视图
                </button>
                <button
                  v-if="canOpenDiagnostics"
                  type="button"
                  :class="
                    viewMode === 'diagnostics' ? activeDangerToolbarTabClass : dangerToolbarTabClass
                  "
                  @click="handleOpenDiagnostics()"
                >
                  诊断视图
                </button>
              </div>

              <button
                type="button"
                class="rounded-sm bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700 transition-colors hover:bg-gray-200"
                @click="$emit('open-design-manager')"
              >
                选择版本
              </button>
            </div>
          </div>

          <div v-if="hasActiveDesignDocument" class="flex flex-1 flex-col bg-[#fbfbfc]">
            <template v-if="viewMode === 'snapshot'">
              <div class="flex-1 overflow-y-auto p-4">
                <div class="rounded-lg border border-slate-200 bg-white p-4">
                  <div class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    需求分析规划稿快照
                  </div>
                  <pre class="whitespace-pre-wrap font-mono text-[12px] leading-6 text-slate-700">{{
                    snapshotMarkdown || '当前版本还没有快照内容。'
                  }}</pre>
                </div>
              </div>

              <div class="border-t border-gray-100 bg-white px-4 py-3">
                <div class="flex items-center justify-between gap-4">
                  <div class="text-[11px] leading-5 text-gray-500">
                    快照始终只读；点击按钮后会在右侧 design copilot 消息面板里出现 system
                    生成块，并覆盖当前版本正文。
                  </div>
                  <button
                    type="button"
                    class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                    @click="$emit('generate-design')"
                  >
                    {{ hasGeneratedDsl ? '再次生成' : '规划设计' }}
                  </button>
                </div>
              </div>
            </template>

            <template v-else-if="viewMode === 'dsl'">
              <div class="border-b border-gray-100 bg-white/80 px-4 py-2 text-[11px] text-gray-500">
                <button
                  type="button"
                  class="rounded bg-gray-100 px-2 py-1 text-[10px] text-gray-600"
                  :disabled="!canOpenDiagnostics"
                  @click="handleOpenDiagnostics()"
                >
                  诊断数量：{{ diagnostics.length }}
                </button>
                <span class="ml-4">正文格式：OFT/1（section-based）</span>
              </div>
              <div class="flex-1 bg-[#fbfbfc] p-4">
                <textarea
                  :value="designContent"
                  class="h-full min-h-[520px] w-full resize-none border-none bg-transparent font-mono text-[12px] leading-6 text-gray-800 outline-none"
                  placeholder="在这里编辑规划设计稿 DSL 蓝图..."
                  @input="
                    $emit('update:design-content', ($event.target as HTMLTextAreaElement).value)
                  "
                ></textarea>
              </div>
            </template>

            <template v-else>
              <div class="flex min-h-0 flex-1 bg-[#fbfbfc]">
                <div class="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
                  <div
                    class="border-b border-gray-100 bg-rose-50/70 px-4 py-2 text-[11px] text-rose-600"
                  >
                    点击右侧诊断项可定位到对应 DSL 行段。当前模式只读。
                  </div>
                  <div
                    ref="diagnosticCodePaneRef"
                    class="flex-1 overflow-auto p-4 font-mono text-[12px]"
                  >
                    <div
                      v-for="row in diagnosticRows"
                      :key="row.lineNumber"
                      :ref="(element) => setDiagnosticLineRef(row.lineNumber, element)"
                      :class="[
                        'grid grid-cols-[52px_1fr] border-b border-transparent px-2 py-0.5 transition-colors',
                        row.hasError ? 'bg-rose-50/90 border-rose-100' : 'bg-white'
                      ]"
                    >
                      <div
                        class="select-none pr-3 text-right text-[11px]"
                        :class="row.hasError ? 'text-rose-500' : 'text-gray-400'"
                      >
                        {{ row.lineNumber }}
                      </div>
                      <div class="whitespace-pre-wrap break-words">
                        <span
                          :class="[
                            row.isSelected ? 'rounded bg-rose-100 px-1 text-rose-700' : '',
                            row.hasError ? 'text-rose-900' : 'text-gray-800'
                          ]"
                        >
                          {{ row.text || ' ' }}
                        </span>
                        <div v-if="row.lineDiagnostics.length" class="mt-1 flex flex-wrap gap-1">
                          <span
                            v-for="diagnostic in row.lineDiagnostics"
                            :key="`${diagnostic.code}-${diagnostic.line}-${diagnostic.column}`"
                            class="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700"
                          >
                            {{ diagnostic.code }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="flex w-[360px] min-w-[360px] flex-col bg-white">
                  <div class="border-b border-gray-100 px-4 py-3">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          错误详情
                        </div>
                        <div class="mt-1 text-[11px] text-gray-400">
                          共 {{ diagnostics.length }} 条诊断
                        </div>
                      </div>
                      <div v-if="diagnostics.length" class="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          class="rounded border border-gray-200 bg-white px-2 py-1 text-[10px] font-semibold text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800"
                          @click="handleCopyDiagnosticsSummary"
                        >
                          复制摘要
                        </button>
                        <button
                          type="button"
                          class="rounded border border-gray-200 bg-white px-2 py-1 text-[10px] font-semibold text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800"
                          @click="handleCopyDiagnosticsDetail"
                        >
                          复制详情
                        </button>
                      </div>
                    </div>
                    <div v-if="diagnostics.length" class="mt-2 text-[10px] leading-5 text-gray-400">
                      摘要便于贴给模型或 issue，详情会包含路径、上下文和定位信息。
                    </div>
                  </div>
                  <div class="flex-1 overflow-auto p-3">
                    <div v-if="diagnostics.length" class="flex flex-col gap-2">
                      <button
                        v-for="(diagnostic, index) in diagnostics"
                        :key="`${diagnostic.code}-${diagnostic.line}-${diagnostic.column}-${index}`"
                        type="button"
                        :class="[
                          'rounded-lg border px-3 py-2 text-left transition-colors',
                          selectedDiagnosticIndex === index
                            ? 'border-rose-300 bg-rose-50'
                            : 'border-gray-200 bg-white hover:border-rose-200 hover:bg-rose-50/60'
                        ]"
                        @click="$emit('select-diagnostic', index)"
                      >
                        <div class="flex items-center justify-between gap-2">
                          <span
                            class="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700"
                          >
                            {{ diagnostic.code }}
                          </span>
                          <span class="text-[10px] text-gray-500">
                            {{ diagnostic.line }}:{{ diagnostic.column }}
                          </span>
                        </div>
                        <div class="mt-2 text-[12px] font-medium leading-5 text-gray-800">
                          {{ diagnostic.message }}
                        </div>
                        <div class="mt-1 text-[11px] leading-5 text-gray-500">
                          路径：{{ diagnostic.path }}
                        </div>
                        <div
                          v-if="diagnostic.context"
                          class="mt-1 rounded bg-gray-50 px-2 py-1 font-mono text-[11px] leading-5 text-gray-600"
                        >
                          {{ diagnostic.context }}
                        </div>
                      </button>
                    </div>
                    <div v-else class="text-[12px] text-gray-500">当前没有诊断错误。</div>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <div v-else class="flex flex-1 items-center justify-center bg-[#fbfbfc] p-6">
            <div class="max-w-sm text-center">
              <div class="text-sm font-semibold text-gray-800">当前还没有选中规划设计稿版本</div>
              <div class="mt-2 text-xs leading-6 text-gray-500">
                先从需求分析与计划的 planning block
                新建一份版本，再在这里切换快照视图和规划设计稿视图。
              </div>
              <button
                type="button"
                class="mt-4 rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                @click="$emit('open-design-manager')"
              >
                打开规划设计稿管理
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { FolderKanban, MessageSquare } from 'lucide-vue-next'
import type { OFBlueprintTextDiagnostic } from '@shared/Orchestraflow-types'
import type { GenerateDesignDocumentViewMode } from '@renderer/stores/orchestraflow/generation-editor/generation-editor.types'
import type { GenerationDesignDocumentStatus } from '@preload/types'

const props = defineProps<{
  sessionTitle: string
  designContent: string
  snapshotMarkdown: string
  designCount: number
  hasActiveDesignDocument: boolean
  hasGeneratedDsl: boolean
  activeDesignTitle: string | null
  activeDesignVersion: number | null
  activePlanningTitle: string | null
  viewMode: GenerateDesignDocumentViewMode
  designStatus: GenerationDesignDocumentStatus | null
  diagnostics: OFBlueprintTextDiagnostic[]
  selectedDiagnosticIndex: number | null
}>()

const emit = defineEmits<{
  (e: 'update:design-content', value: string): void
  (e: 'update:view-mode', value: GenerateDesignDocumentViewMode): void
  (e: 'generate-design'): void
  (e: 'open-copilot'): void
  (e: 'open-sessions'): void
  (e: 'open-design-manager'): void
  (e: 'select-diagnostic', index: number): void
}>()

const toolbarTabClass =
  'rounded px-2.5 py-1.5 text-[11px] font-medium text-gray-500 transition-colors hover:text-gray-700'
const activeToolbarTabClass =
  'rounded bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-800 shadow-sm'
const dangerToolbarTabClass =
  'rounded px-2.5 py-1.5 text-[11px] font-medium text-rose-500 transition-colors hover:text-rose-700'
const activeDangerToolbarTabClass =
  'rounded bg-white px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 shadow-sm'

const canOpenDiagnostics = computed(() => props.diagnostics.length > 0)

const statusText = computed(() => {
  if (!props.hasActiveDesignDocument) return '未选择版本'
  if (props.designStatus === 'streaming') return '生成中'
  if (props.designStatus === 'valid') return '已通过校验'
  if (props.designStatus === 'invalid') return '存在错误'
  if (props.designStatus === 'aborted') return '已中断'
  if (props.designStatus === 'error') return '生成失败'
  return '待生成'
})

const statusBadgeClass = computed(() => {
  const interactive = canOpenDiagnostics.value ? 'cursor-pointer hover:opacity-90' : ''
  if (!props.hasActiveDesignDocument) {
    return `rounded bg-gray-100 px-2 py-1 text-[10px] text-gray-500 ${interactive}`.trim()
  }
  if (props.designStatus === 'streaming') {
    return `rounded bg-sky-100 px-2 py-1 text-[10px] font-semibold text-sky-700 ${interactive}`.trim()
  }
  if (props.designStatus === 'valid') {
    return `rounded bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700 ${interactive}`.trim()
  }
  if (props.designStatus === 'invalid' || props.designStatus === 'error') {
    return `rounded bg-rose-100 px-2 py-1 text-[10px] font-semibold text-rose-700 ${interactive}`.trim()
  }
  if (props.designStatus === 'aborted') {
    return `rounded bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700 ${interactive}`.trim()
  }
  return `rounded bg-gray-100 px-2 py-1 text-[10px] text-gray-500 ${interactive}`.trim()
})

const diagnosticLineMap = computed(() => {
  const map = new Map<number, OFBlueprintTextDiagnostic[]>()
  props.diagnostics.forEach((diagnostic) => {
    for (let line = diagnostic.line; line <= diagnostic.endLine; line += 1) {
      const list = map.get(line) || []
      list.push(diagnostic)
      map.set(line, list)
    }
  })
  return map
})

const diagnosticRows = computed(() => {
  return props.designContent.split('\n').map((text, index) => {
    const lineNumber = index + 1
    const lineDiagnostics = diagnosticLineMap.value.get(lineNumber) || []
    return {
      lineNumber,
      text,
      lineDiagnostics,
      hasError: lineDiagnostics.length > 0,
      isSelected:
        props.selectedDiagnosticIndex !== null &&
        lineDiagnostics.includes(props.diagnostics[props.selectedDiagnosticIndex])
    }
  })
})

const diagnosticCodePaneRef = ref<HTMLElement | null>(null)
const diagnosticLineRefs = new Map<number, HTMLElement>()

const diagnosticsSummaryText = computed(() => {
  if (!props.diagnostics.length) {
    return '当前没有诊断错误。'
  }

  return props.diagnostics
    .map((diagnostic, index) => {
      return [
        `#${index + 1} ${diagnostic.code}`,
        `${diagnostic.message}`,
        `位置: ${diagnostic.line}:${diagnostic.column} -> ${diagnostic.endLine}:${diagnostic.endColumn}`,
        `路径: ${diagnostic.path}`
      ].join('\n')
    })
    .join('\n\n')
})

const diagnosticsDetailText = computed(() => {
  if (!props.diagnostics.length) {
    return '当前没有诊断错误。'
  }

  return JSON.stringify(props.diagnostics, null, 2)
})

function setDiagnosticLineRef(lineNumber: number, element: Element | null): void {
  if (!element) {
    diagnosticLineRefs.delete(lineNumber)
    return
  }
  diagnosticLineRefs.set(lineNumber, element as HTMLElement)
}

function handleOpenDiagnostics(): void {
  if (!canOpenDiagnostics.value) return
  emit('update:view-mode', 'diagnostics')
  if (props.selectedDiagnosticIndex === null) {
    emit('select-diagnostic', 0)
  }
}

async function handleCopyDiagnosticsSummary(): Promise<void> {
  // 复制“人类可读摘要”，适合直接粘贴给模型、issue 或群里讨论。
  await navigator.clipboard.writeText(diagnosticsSummaryText.value)
}

async function handleCopyDiagnosticsDetail(): Promise<void> {
  // 复制完整结构化明细，保留 code/path/context/行列号，方便后续精确排查。
  await navigator.clipboard.writeText(diagnosticsDetailText.value)
}

watch(
  () => [props.viewMode, props.selectedDiagnosticIndex, props.diagnostics] as const,
  async () => {
    if (props.viewMode !== 'diagnostics' || props.selectedDiagnosticIndex === null) {
      return
    }
    const diagnostic = props.diagnostics[props.selectedDiagnosticIndex]
    if (!diagnostic) return
    await nextTick()
    diagnosticLineRefs.get(diagnostic.line)?.scrollIntoView({
      block: 'center',
      behavior: 'smooth'
    })
  },
  { deep: true }
)
</script>
