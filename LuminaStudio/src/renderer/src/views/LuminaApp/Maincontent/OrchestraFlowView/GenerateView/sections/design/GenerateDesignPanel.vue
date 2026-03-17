<template>
  <div class="of-generate-design flex h-full flex-col bg-[#fcfcfd]">
    <div class="border-b border-gray-200 bg-white px-6 py-4">
      <div class="flex items-center justify-between gap-4 overflow-hidden">
        <div class="min-w-0 overflow-hidden">
          <div class="text-[13px] font-semibold text-gray-800">规划设计稿</div>
          <div class="mt-1 truncate text-xs leading-5 text-gray-500">
            当前会话：{{ sessionTitle }}
            <template v-if="activeDocument">
              ，当前版本：{{ activeDocument.title }} / V{{ activeDocument.version }}
            </template>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <span class="rounded bg-gray-100 px-2 py-1 text-[10px] text-gray-500">
            设计稿 {{ designCount }} 份
          </span>
          <button type="button" :class="statusBadgeClass" :disabled="!canOpenDiagnostics">
            {{ statusText }}
          </button>
          <button
            type="button"
            class="rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            @click="emit('create-design')"
          >
            新建设计稿
          </button>
          <button
            type="button"
            title="打开规划设计稿管理"
            class="rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            @click="emit('open-design-manager')"
          >
            查看规划设计稿
          </button>
          <button
            type="button"
            title="打开 copilot"
            class="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 transition-colors hover:text-gray-800 disabled:cursor-not-allowed disabled:text-gray-300"
            :disabled="!activeDocument"
            @click="emit('open-copilot')"
          >
            <MessageSquare :size="15" />
          </button>
          <button
            type="button"
            title="切换会话"
            class="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 transition-colors hover:text-gray-800"
            @click="emit('open-sessions')"
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
                当前基于新 TOML 作者态协议工作，不恢复旧 DSL 协议。
              </div>
            </div>

            <div class="flex items-center gap-2">
              <div class="flex rounded border border-gray-200 bg-gray-100 p-0.5">
                <button
                  type="button"
                  :class="viewMode === 'preview' ? activeToolbarTabClass : toolbarTabClass"
                  @click="emit('update:view-mode', 'preview')"
                >
                  快照视图
                </button>
                <button
                  type="button"
                  :class="viewMode === 'dsl' ? activeToolbarTabClass : toolbarTabClass"
                  :disabled="!activeDocument"
                  @click="emit('update:view-mode', 'dsl')"
                >
                  设计稿视图
                </button>
                <button
                  v-if="canOpenDiagnostics"
                  type="button"
                  :class="
                    viewMode === 'diagnostics' ? activeDangerToolbarTabClass : dangerToolbarTabClass
                  "
                  @click="emit('update:view-mode', 'diagnostics')"
                >
                  诊断视图
                </button>
              </div>

              <button
                type="button"
                class="rounded-sm bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-400"
                :disabled="!canCompileWorkflow"
                @click="handleCompile"
              >
                编译为工作流
              </button>
            </div>
          </div>

          <div v-if="activeDocument" class="flex flex-1 flex-col bg-[#fbfbfc]">
            <template v-if="viewMode === 'preview'">
              <div class="flex-1 overflow-y-auto p-4">
                <div class="rounded-lg border border-slate-200 bg-white p-4">
                  <div class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    需求分析快照
                  </div>
                  <pre class="whitespace-pre-wrap font-mono text-[12px] leading-6 text-slate-700">{{
                    sourcePreview || '当前没有可用的需求分析内容。'
                  }}</pre>
                </div>
              </div>

              <div class="border-t border-gray-100 bg-white px-4 py-3">
                <div class="flex items-center justify-between gap-4">
                  <div class="text-[11px] leading-5 text-gray-500">
                    这里保留旧版的“快照视图”使用感，但底层已经切到当前新的 analysis / design 主链。
                  </div>
                  <button
                    type="button"
                    class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                    @click="emit('start-design')"
                  >
                    {{ activeDocument.content.trim() ? '继续设计' : '开始设计' }}
                  </button>
                </div>
              </div>
            </template>

            <template v-else-if="viewMode === 'dsl'">
              <div class="flex-1 bg-[#fbfbfc] p-4">
                <textarea
                  :value="activeDocument.content"
                  class="h-full min-h-[520px] w-full resize-none border-none bg-transparent font-mono text-[12px] leading-6 text-gray-800 outline-none"
                  placeholder="在这里编辑规划设计稿 TOML..."
                  @input="
                    emit('update:design-content', ($event.target as HTMLTextAreaElement).value)
                  "
                ></textarea>
              </div>
            </template>

            <template v-else>
              <div class="flex min-h-0 flex-1 bg-[#fbfbfc]">
                <!-- 左侧：逐行 diff 标红视图 -->
                <div class="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
                  <div
                    class="border-b border-gray-100 bg-rose-50/70 px-4 py-2 text-[11px] text-rose-600"
                  >
                    这里展示“本地静态检查”的诊断结果（不会写回 validationJson）。
                  </div>

                  <div class="flex-1 overflow-auto font-mono text-[12px] leading-6">
                    <div
                      v-for="(lineText, idx) in tomlLines"
                      :key="idx"
                      :class="[
                        'flex',
                        lineAnnotationMap[idx + 1]?.severity === 'error'
                          ? 'bg-rose-50'
                          : lineAnnotationMap[idx + 1]?.severity === 'warning'
                            ? 'bg-amber-50'
                            : ''
                      ]"
                    >
                      <span
                        :class="[
                          'inline-block w-12 shrink-0 select-none border-r px-2 py-0.5 text-right text-gray-400',
                          lineAnnotationMap[idx + 1]?.severity === 'error'
                            ? 'border-rose-200 bg-rose-100 text-rose-600'
                            : lineAnnotationMap[idx + 1]?.severity === 'warning'
                              ? 'border-amber-200 bg-amber-100 text-amber-700'
                              : 'border-gray-100'
                        ]"
                      >{{ idx + 1 }}</span>
                      <pre class="flex-1 whitespace-pre-wrap px-3 py-0.5">{{ lineText }}</pre>
                    </div>
                  </div>
                </div>

                <!-- 右侧：诊断详情 + 建议 -->
                <div class="flex w-[360px] min-w-[360px] flex-col bg-white">
                  <div class="border-b border-gray-100 px-4 py-3">
                    <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      错误详情
                    </div>
                    <div class="mt-1 text-[11px] text-gray-400">共 {{ diagnostics.length }} 条诊断</div>
                  </div>
                  <div class="flex-1 overflow-auto p-3">
                    <div v-if="diagnostics.length" class="flex flex-col gap-2">
                      <button
                        v-for="(diagnostic, index) in diagnostics"
                        :key="`${diagnostic.code}-${diagnostic.path || index}`"
                        type="button"
                        :class="[
                          'rounded-lg border px-3 py-2 text-left transition-colors',
                          selectedDiagnosticIndex === index
                            ? 'border-rose-300 bg-rose-50'
                            : 'border-gray-200 bg-white hover:border-rose-200 hover:bg-rose-50/60'
                        ]"
                        @click="emit('select-diagnostic', index)"
                      >
                        <div class="flex items-center justify-between gap-2">
                          <span
                            class="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700"
                          >
                            {{ diagnostic.code }}
                          </span>
                          <span class="text-[10px] text-gray-500">{{ diagnostic.category }}</span>
                        </div>

                        <div class="mt-2 text-[12px] font-medium leading-5 text-gray-800">
                          {{ diagnostic.message }}
                        </div>

                        <div
                          v-if="diagnostic.lineRange"
                          class="mt-1 text-[11px] leading-5 text-gray-500"
                        >
                          行号：{{ diagnostic.lineRange.start }}-{{ diagnostic.lineRange.end }}
                        </div>

                        <div
                          v-if="diagnostic.path"
                          class="mt-1 text-[11px] leading-5 text-gray-500"
                        >
                          路径：{{ diagnostic.path }}
                        </div>

                        <div v-if="getSuggestions(diagnostic).length" class="mt-2 rounded border border-emerald-200 bg-emerald-50 p-2">
                          <div class="text-[11px] font-semibold text-emerald-700">建议</div>
                          <ul class="mt-1 list-disc pl-4 text-[11px] leading-5 text-emerald-800">
                            <li v-for="(s, si) in getSuggestions(diagnostic)" :key="si">{{ s }}</li>
                          </ul>
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
                先创建一份设计稿，再在这里切换快照视图和设计稿视图。
              </div>
              <button
                type="button"
                class="mt-4 rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                @click="emit('open-design-manager')"
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
import { computed } from 'vue'
import { resolveDiagnosticSuggestions } from '@shared/Orchestraflow-types'
import type { CheckDiagnostic, CheckResult } from '@shared/Orchestraflow-types'
import { FolderKanban, MessageSquare } from 'lucide-vue-next'
import type {
  GenerationDesignDocument,
  GenerationDesignDocumentStatus,
  GenerationValidationDiagnostic
} from '@preload/types'

const props = defineProps<{
  sessionTitle: string
  sourcePreview: string
  activeDocument: GenerationDesignDocument | null
  designCount: number
  viewMode: 'preview' | 'dsl' | 'diagnostics'

  // 旧：后端 validationJson 的诊断（保留，避免破坏现有链路）
  // 旧：后端 validationJson 的诊断（目前仍保留 props，方便你以后需要对比/回退）
  diagnostics: GenerationValidationDiagnostic[]

  // 新：本地静态检查结果（用于 diff 标红视图）
  localCheckResult: CheckResult | null

  selectedDiagnosticIndex: number | null
  isCopilotStreaming: boolean
}>()

const emit = defineEmits<{
  (e: 'update:design-content', value: string): void
  (e: 'update:view-mode', value: 'preview' | 'dsl' | 'diagnostics'): void
  (e: 'create-design'): void
  (e: 'compile-workflow'): void
  (e: 'open-copilot'): void
  (e: 'start-design'): void
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

const canOpenDiagnostics = computed(() => {
  // diagnostics tab 仍允许打开（例如后端 compile 后写回的 validationJson）
  return Boolean(props.localCheckResult?.diagnostics?.length)
})

// diagnostics tab 的渲染使用本地静态检查结果；
// 用户编辑时就能即时看到标红，而不需要等后端写回 validationJson。
const diagnostics = computed(() => {
  return props.localCheckResult?.diagnostics || []
})

const hasLocalErrors = computed(() => {
  return Boolean(props.localCheckResult?.diagnostics?.some((d) => d.severity === 'error'))
})

const canCompileWorkflow = computed(() => {
  return Boolean(props.activeDocument?.content.trim()) && !props.isCopilotStreaming
})

const statusText = computed(() => {
  return resolveStatusLabel(props.activeDocument?.status || null)
})

const statusBadgeClass = computed(() => {
  const interactive = canOpenDiagnostics.value ? 'cursor-pointer hover:opacity-90' : ''
  if (!props.activeDocument) {
    return `rounded bg-gray-100 px-2 py-1 text-[10px] text-gray-500 ${interactive}`.trim()
  }
  if (props.activeDocument.status === 'valid') {
    return `rounded bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700 ${interactive}`.trim()
  }
  if (props.activeDocument.status === 'invalid') {
    return `rounded bg-rose-100 px-2 py-1 text-[10px] font-semibold text-rose-700 ${interactive}`.trim()
  }
  return `rounded bg-gray-100 px-2 py-1 text-[10px] text-gray-500 ${interactive}`.trim()
})

const tomlLines = computed(() => {
  return (props.activeDocument?.content || '').split(/\r?\n/)
})

const lineAnnotationMap = computed(() => {
  const map = new Map<number, (CheckResult['lineAnnotations'][number])>()
  for (const a of props.localCheckResult?.lineAnnotations || []) {
    map.set(a.line, a)
  }
  return map
})

function getSuggestions(diagnostic: Pick<CheckDiagnostic, 'code'>): string[] {
  return resolveDiagnosticSuggestions(diagnostic)
}

function handleCompile(): void {
  // A 方案：只提示，不阻断。
  // 这里先用系统 confirm，后续如果你需要更一致的 UI 再换成 dialog 组件。
  if (hasLocalErrors.value) {
    const ok = window.confirm('当前设计稿存在静态检查错误，仍然要编译吗？')
    if (!ok) {
      return
    }
  }
  emit('compile-workflow')
}

function resolveStatusLabel(status: GenerationDesignDocumentStatus | null): string {
  if (status === 'valid') return '已通过校验'
  if (status === 'invalid') return '存在错误'
  if (status === 'draft') return '草稿'
  return '未选择版本'
}
</script>
