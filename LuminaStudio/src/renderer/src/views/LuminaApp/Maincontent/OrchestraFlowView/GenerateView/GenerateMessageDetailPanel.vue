<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-6 backdrop-blur-[1px]"
  >
    <div
      class="absolute inset-0"
      @click="$emit('close')"
    ></div>

    <section class="relative flex h-[82vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
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

      <div class="border-b border-gray-100 bg-gray-50 px-5 py-2">
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
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-hidden">
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
            <div v-if="rawTab === 'rendered'" class="rounded-xl border border-gray-200 bg-white p-4">
              <pre class="whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-gray-800">{{
                renderedText
              }}</pre>
            </div>
            <div v-else class="rounded-xl border border-gray-200 bg-white p-4">
              <pre class="whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-gray-800">{{
                rawJson
              }}</pre>
            </div>
          </div>
        </template>

        <template v-else>
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
                  <pre class="whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-gray-800">{{
                    systemPromptText
                  }}</pre>
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
                  <pre class="whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-gray-800">{{
                    userPromptText
                  }}</pre>
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

const rootTab = ref<'raw' | 'payload'>('raw')
const rawTab = ref<'rendered' | 'json'>('rendered')
const sections = reactive({
  system: true,
  user: true
})

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    rootTab.value = 'raw'
    rawTab.value = 'rendered'
    sections.system = true
    sections.user = true
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

const userPromptText = computed(() => {
  const promptTexts = props.run?.prompts.map((item) => `[${item.title}]\n${item.prompt}`) || []
  if (promptTexts.length) {
    return promptTexts.join('\n\n')
  }
  return props.relatedUserMessage?.content || props.message?.content || '当前没有捕获到 user prompt。'
})
</script>
