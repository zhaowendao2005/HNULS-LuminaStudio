<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-6 backdrop-blur-[1px]"
  >
    <div class="absolute inset-0" @click="$emit('close')"></div>

    <section
      class="relative flex h-[82vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
    >
      <header class="flex items-center justify-between border-b border-gray-200 px-5 py-3">
        <div class="min-w-0">
          <div class="text-sm font-semibold text-gray-900">消息详情</div>
          <div class="mt-1 text-xs text-gray-500">
            {{ messageTitle }}
          </div>
        </div>
        <button
          type="button"
          class="rounded px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100"
          @click="$emit('close')"
        >
          关闭
        </button>
      </header>

      <!-- 顶层 tabs + 一键复制当前 tab -->
      <div class="border-b border-gray-100 bg-gray-50 px-5 py-2">
        <div class="flex items-center justify-between gap-3">
          <div class="flex gap-2">
            <button
              type="button"
              :class="rootTab === 'raw' ? activeTabClass : tabClass"
              @click="rootTab = 'raw'"
            >
              Raw
            </button>
            <button
              type="button"
              :class="rootTab === 'payload' ? activeTabClass : tabClass"
              @click="rootTab = 'payload'"
            >
              发生内容
            </button>
            <button
              type="button"
              :class="rootTab === 'prompt' ? activeTabClass : tabClass"
              @click="rootTab = 'prompt'"
            >
              Prompt
            </button>
          </div>

          <button
            type="button"
            class="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-100"
            @click="copyCurrentTab()"
          >
            复制当前
          </button>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-hidden">
        <!-- Raw tab -->
        <template v-if="rootTab === 'raw'">
          <div class="border-b border-gray-100 bg-white px-5 py-2">
            <div class="flex gap-2">
              <button
                type="button"
                :class="rawTab === 'rendered' ? activeTabClass : tabClass"
                @click="rawTab = 'rendered'"
              >
                渲染
              </button>
              <button
                type="button"
                :class="rawTab === 'json' ? activeTabClass : tabClass"
                @click="rawTab = 'json'"
              >
                JSON Raw
              </button>
            </div>
          </div>

          <div class="h-full overflow-auto bg-[#fbfbfc] p-5">
            <div
              v-if="rawTab === 'rendered'"
              class="rounded-xl border border-gray-200 bg-white p-4"
            >
              <pre
                class="whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-gray-800"
                >{{ renderedText }}</pre
              >
            </div>
            <div v-else class="rounded-xl border border-gray-200 bg-white p-4">
              <pre
                class="whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-gray-800"
                >{{ rawJson }}</pre
              >
            </div>
          </div>
        </template>

        <!-- 发生内容 tab -->
        <template v-else-if="rootTab === 'payload'">
          <div class="h-full overflow-auto bg-[#fbfbfc] p-5">
            <div class="space-y-4">
              <section class="rounded-xl border border-gray-200 bg-white">
                <button
                  type="button"
                  class="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 text-left"
                  @click="sections.system = !sections.system"
                >
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-400">{{ sections.system ? '^' : '>' }}</span>
                    <span class="text-sm font-semibold text-gray-800">system prompt</span>
                  </div>
                </button>
                <div v-if="sections.system" class="px-4 py-4">
                  <pre
                    class="whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-gray-800"
                    >{{ systemPromptText }}</pre
                  >
                </div>
              </section>

              <section class="rounded-xl border border-gray-200 bg-white">
                <button
                  type="button"
                  class="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 text-left"
                  @click="sections.user = !sections.user"
                >
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-400">{{ sections.user ? '^' : '>' }}</span>
                    <span class="text-sm font-semibold text-gray-800">user prompt</span>
                  </div>
                </button>
                <div v-if="sections.user" class="px-4 py-4">
                  <pre
                    class="whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-gray-800"
                    >{{ userPromptText }}</pre
                  >
                </div>
              </section>
            </div>
          </div>
        </template>

        <!-- Prompt tab：渲染本次 run 捕获到的 prompt / context 快照（用于调试 LLM 为什么这样生成） -->
        <template v-else>
          <div class="h-full overflow-auto bg-[#fbfbfc] p-5">
            <div class="space-y-4">
              <section class="rounded-xl border border-gray-200 bg-white">
                <button
                  type="button"
                  class="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 text-left"
                  @click="sections.prompts = !sections.prompts"
                >
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-400">{{ sections.prompts ? '^' : '>' }}</span>
                    <span class="text-sm font-semibold text-gray-800">
                      prompt snapshots（传入的 prompt）
                    </span>
                  </div>
                  <span class="text-xs text-gray-400">{{ promptSnapshots.length }} 条</span>
                </button>
                <div v-if="sections.prompts" class="px-4 py-4">
                  <div v-if="promptSnapshots.length" class="space-y-3">
                    <div
                      v-for="(p, idx) in promptSnapshots"
                      :key="`${p.runId}-${p.stepKey}-${idx}`"
                      class="rounded-lg border border-gray-200 bg-white p-3"
                    >
                      <div class="flex flex-wrap items-center justify-between gap-2">
                        <div class="min-w-0">
                          <div class="text-xs font-semibold text-gray-800">{{ p.title }}</div>
                          <div class="mt-0.5 text-[11px] text-gray-500">
                            stepKey：{{ p.stepKey }}
                          </div>
                        </div>
                        <button
                          type="button"
                          class="rounded bg-gray-50 px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-100"
                          @click="copyText(p.prompt)"
                        >
                          复制
                        </button>
                      </div>
                      <pre
                        class="mt-2 whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-gray-800"
                        >{{ p.prompt }}</pre
                      >
                    </div>
                  </div>
                  <div v-else class="text-xs text-gray-500">
                    当前 run 没有捕获到 prompt-snapshot。
                  </div>
                </div>
              </section>

              <section class="rounded-xl border border-gray-200 bg-white">
                <button
                  type="button"
                  class="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 text-left"
                  @click="sections.contexts = !sections.contexts"
                >
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-400">{{ sections.contexts ? '^' : '>' }}</span>
                    <span class="text-sm font-semibold text-gray-800">
                      context snapshots（发生的上下文）
                    </span>
                  </div>
                  <span class="text-xs text-gray-400">{{ contextSnapshots.length }} 条</span>
                </button>
                <div v-if="sections.contexts" class="px-4 py-4">
                  <div v-if="contextSnapshots.length" class="space-y-3">
                    <div
                      v-for="(c, idx) in contextSnapshots"
                      :key="`${c.runId}-${c.stepKey}-${idx}`"
                      class="rounded-lg border border-gray-200 bg-white p-3"
                    >
                      <div class="flex flex-wrap items-center justify-between gap-2">
                        <div class="min-w-0">
                          <div class="text-xs font-semibold text-gray-800">{{ c.title }}</div>
                          <div class="mt-0.5 text-[11px] text-gray-500">
                            stepKey：{{ c.stepKey }}
                          </div>
                        </div>
                        <button
                          type="button"
                          class="rounded bg-gray-50 px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-100"
                          @click="copyText(c.context)"
                        >
                          复制
                        </button>
                      </div>
                      <pre
                        class="mt-2 whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-gray-800"
                        >{{ c.context }}</pre
                      >
                    </div>
                  </div>
                  <div v-else class="text-xs text-gray-500">
                    当前 run 没有捕获到 context-snapshot。
                  </div>
                </div>
              </section>

              <section class="rounded-xl border border-gray-200 bg-white">
                <button
                  type="button"
                  class="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 text-left"
                  @click="sections.memories = !sections.memories"
                >
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-400">{{ sections.memories ? '^' : '>' }}</span>
                    <span class="text-sm font-semibold text-gray-800">memory snapshots</span>
                  </div>
                  <span class="text-xs text-gray-400">{{ memorySnapshots.length }} 条</span>
                </button>
                <div v-if="sections.memories" class="px-4 py-4">
                  <div v-if="memorySnapshots.length" class="space-y-3">
                    <div
                      v-for="(m, idx) in memorySnapshots"
                      :key="`${m.runId}-${m.stepKey}-${idx}`"
                      class="rounded-lg border border-gray-200 bg-white p-3"
                    >
                      <div class="flex flex-wrap items-center justify-between gap-2">
                        <div class="min-w-0">
                          <div class="text-xs font-semibold text-gray-800">
                            stepKey：{{ m.stepKey }}
                          </div>
                        </div>
                        <button
                          type="button"
                          class="rounded bg-gray-50 px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-100"
                          @click="copyText(JSON.stringify(m.memory, null, 2))"
                        >
                          复制
                        </button>
                      </div>
                      <pre
                        class="mt-2 whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-gray-800"
                        >{{ JSON.stringify(m.memory, null, 2) }}</pre
                      >
                    </div>
                  </div>
                  <div v-else class="text-xs text-gray-500">
                    当前 run 没有捕获到 memory-snapshot。
                  </div>
                </div>
              </section>

              <section class="rounded-xl border border-gray-200 bg-white">
                <button
                  type="button"
                  class="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 text-left"
                  @click="sections.validations = !sections.validations"
                >
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-400">
                      {{ sections.validations ? '^' : '>' }}
                    </span>
                    <span class="text-sm font-semibold text-gray-800">validation reports</span>
                  </div>
                  <span class="text-xs text-gray-400">{{ validationReports.length }} 条</span>
                </button>
                <div v-if="sections.validations" class="px-4 py-4">
                  <div v-if="validationReports.length" class="space-y-3">
                    <div
                      v-for="(v, idx) in validationReports"
                      :key="`${v.runId}-${idx}`"
                      class="rounded-lg border border-gray-200 bg-white p-3"
                    >
                      <div class="flex flex-wrap items-center justify-between gap-2">
                        <div class="min-w-0">
                          <div class="text-xs font-semibold text-gray-800">validation-report</div>
                        </div>
                        <button
                          type="button"
                          class="rounded bg-gray-50 px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-100"
                          @click="copyText(JSON.stringify(v.report, null, 2))"
                        >
                          复制
                        </button>
                      </div>
                      <pre
                        class="mt-2 whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-gray-800"
                        >{{ JSON.stringify(v.report, null, 2) }}</pre
                      >
                    </div>
                  </div>
                  <div v-else class="text-xs text-gray-500">
                    当前 run 没有捕获到 validation-report。
                  </div>
                </div>
              </section>

              <section class="rounded-xl border border-gray-200 bg-white">
                <button
                  type="button"
                  class="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 text-left"
                  @click="sections.budgets = !sections.budgets"
                >
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-400">{{ sections.budgets ? '^' : '>' }}</span>
                    <span class="text-sm font-semibold text-gray-800">budget updates</span>
                  </div>
                  <span class="text-xs text-gray-400">{{ budgetUpdates.length }} 条</span>
                </button>
                <div v-if="sections.budgets" class="px-4 py-4">
                  <div v-if="budgetUpdates.length" class="space-y-2">
                    <div
                      v-for="(b, idx) in budgetUpdates"
                      :key="`${b.runId}-${idx}`"
                      class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700"
                    >
                      iteration {{ b.iteration }}/{{ b.maxIterations }} · spentTokens={{
                        b.spentTokens
                      }}
                    </div>
                  </div>
                  <div v-else class="text-xs text-gray-500">
                    当前 run 没有捕获到 budget-update。
                  </div>
                </div>
              </section>
            </div>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { GenerationMessage } from '@preload/types'
import type { RunInspectorRecord } from '@renderer/stores/orchestraflow/generation-editor/inspector/run-inspector.types'

const props = defineProps<{
  visible: boolean
  mode: 'analysis' | 'design'
  message: GenerationMessage | null
  relatedUserMessage: GenerationMessage | null
  run: RunInspectorRecord | null
}>()

defineEmits<{
  (e: 'close'): void
}>()

const rootTab = ref<'raw' | 'payload' | 'prompt'>('raw')
const rawTab = ref<'rendered' | 'json'>('rendered')
const sections = reactive({
  system: true,
  user: true,
  prompts: true,
  contexts: true,
  memories: true,
  validations: true,
  budgets: true
})

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    rootTab.value = 'raw'
    rawTab.value = 'rendered'
    sections.system = true
    sections.user = true
    sections.prompts = true
    sections.contexts = true
    sections.memories = true
    sections.validations = true
    sections.budgets = true
  }
)

const tabClass =
  'rounded-md px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800'
const activeTabClass =
  'rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-sm'

const messageTitle = computed(() => {
  if (!props.message) return '未选择消息'
  return `${props.message.role} · ${props.message.channelKey} · ${props.message.status}`
})

const renderedText = computed(() => {
  if (!props.message) return '暂无渲染内容。'
  return props.message.content || '暂无渲染内容。'
})

const rawJson = computed(() => {
  return JSON.stringify(
    {
      message: props.message,
      relatedUserMessage: props.relatedUserMessage,
      run: props.run
    },
    null,
    2
  )
})

const systemPromptText = computed(() => {
  const firstPrompt = props.run?.prompts[0]
  if (!firstPrompt) {
    return props.mode === 'analysis'
      ? '你负责把需求整理成 analysis markdown。'
      : '你负责输出可编译的 OrchestraFlow TOML。'
  }

  if (firstPrompt.stepKey === 'analysis-planner') {
    return '你负责把需求整理成 analysis markdown。'
  }
  if (firstPrompt.stepKey === 'planning-copilot') {
    return '你负责给 analysis 文档产出 TOML patch。'
  }
  if (firstPrompt.stepKey === 'design-planner') {
    return '你负责输出可编译的 OrchestraFlow TOML。'
  }
  return '当前没有独立记录的 system prompt。'
})

const promptSnapshots = computed(() => props.run?.prompts || [])
const contextSnapshots = computed(() => props.run?.contexts || [])
const memorySnapshots = computed(() => props.run?.memories || [])
const validationReports = computed(() => props.run?.validations || [])
const budgetUpdates = computed(() => props.run?.budgets || [])

const userPromptText = computed(() => {
  const promptTexts = props.run?.prompts.map((item) => `[${item.title}]\n${item.prompt}`) || []
  if (promptTexts.length) {
    return promptTexts.join('\n\n')
  }
  return (
    props.relatedUserMessage?.content || props.message?.content || '当前没有捕获到 user prompt。'
  )
})

const payloadCopyText = computed(() => {
  return [
    `[system prompt]\n${systemPromptText.value}`,
    `[user prompt]\n${userPromptText.value}`
  ].join('\n\n')
})

const promptCopyText = computed(() => {
  const promptText = promptSnapshots.value.length
    ? promptSnapshots.value
        .map((p) => `[${p.title}] (stepKey=${p.stepKey})\n${p.prompt}`)
        .join('\n\n')
    : '（无 prompt-snapshot）'

  const contextText = contextSnapshots.value.length
    ? contextSnapshots.value
        .map((c) => `[${c.title}] (stepKey=${c.stepKey})\n${c.context}`)
        .join('\n\n')
    : '（无 context-snapshot）'

  const memoryText = memorySnapshots.value.length
    ? memorySnapshots.value
        .map((m) => `[memory] (stepKey=${m.stepKey})\n${JSON.stringify(m.memory, null, 2)}`)
        .join('\n\n')
    : '（无 memory-snapshot）'

  const validationText = validationReports.value.length
    ? validationReports.value
        .map((v) => `[validation-report]\n${JSON.stringify(v.report, null, 2)}`)
        .join('\n\n')
    : '（无 validation-report）'

  const budgetText = budgetUpdates.value.length
    ? budgetUpdates.value
        .map(
          (b) =>
            `[budget-update] iteration=${b.iteration}/${b.maxIterations} spentTokens=${b.spentTokens}`
        )
        .join('\n')
    : '（无 budget-update）'

  return [
    `[prompt snapshots]\n${promptText}`,
    `[context snapshots]\n${contextText}`,
    `[memory snapshots]\n${memoryText}`,
    `[validation reports]\n${validationText}`,
    `[budget updates]\n${budgetText}`
  ].join('\n\n')
})

function copyText(text: string): void {
  void navigator.clipboard.writeText(text)
}

function copyCurrentTab(): void {
  if (rootTab.value === 'raw') {
    copyText(rawTab.value === 'json' ? rawJson.value : renderedText.value)
    return
  }
  if (rootTab.value === 'payload') {
    copyText(payloadCopyText.value)
    return
  }
  copyText(promptCopyText.value)
}
</script>
