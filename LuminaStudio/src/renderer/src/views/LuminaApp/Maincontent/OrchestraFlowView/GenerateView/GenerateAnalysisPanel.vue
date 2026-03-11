<template>
  <div class="of-generate-analysis mx-auto flex h-full max-w-4xl flex-col">
    <div class="border-b border-gray-100 px-6 py-4">
      <div class="flex items-center justify-between gap-4">
        <div>
          <div class="text-[13px] font-semibold text-gray-800">{{ session.title }}</div>
          <div class="mt-1 text-xs text-gray-500">{{ session.summary }}</div>
        </div>
        <div class="flex items-center gap-2">
          <span class="rounded bg-gray-100 px-2 py-1 text-[10px] text-gray-500">
            当前阶段：{{ currentSessionStageLabel }}
          </span>
          <button
            type="button"
            class="rounded border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] text-violet-700 transition-colors hover:bg-violet-100"
            @click="$emit('open-copilot')"
          >
            Auto Copilot
          </button>
          <button
            type="button"
            class="rounded border border-gray-200 px-2.5 py-1 text-[11px] text-gray-500 transition-colors hover:border-cyan-200 hover:text-cyan-600"
            @click="$emit('open-sessions')"
          >
            切换会话
          </button>
        </div>
      </div>
    </div>

    <div class="flex-1 space-y-6 overflow-y-auto px-6 py-4">
      <div v-for="message in session.messages" :key="message.id" class="flex gap-4">
        <div
          v-if="message.role === 'user'"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100"
        >
          <UserCircle :size="18" class="text-gray-500" />
        </div>
        <div
          v-else-if="message.role === 'assistant'"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-cyan-100 bg-cyan-50"
        >
          <Bot :size="18" class="text-cyan-600" />
        </div>
        <div
          v-else
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-emerald-100 bg-emerald-50"
        >
          <Activity :size="18" class="text-emerald-600" />
        </div>

        <div v-if="message.kind === 'plan-card'" class="w-full">
          <div class="group relative border-l-2 border-emerald-500 bg-gray-50/50 p-4">
            <div
              class="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-600"
            >
              <Check :size="12" />
              计划生成完毕
            </div>

            <div class="mb-4 space-y-3">
              <div>
                <div class="mb-0.5 text-xs text-gray-500">需求摘要</div>
                <div class="text-[13px] font-semibold text-gray-800">
                  {{ session.plan.summary }}
                </div>
              </div>
              <div>
                <div class="mb-0.5 text-xs text-gray-500">执行步骤</div>
                <ol class="list-decimal space-y-1 pl-4 text-[13px] text-gray-800">
                  <li v-for="step in session.plan.steps" :key="step">{{ step }}</li>
                </ol>
              </div>
            </div>

            <div class="flex gap-2 border-t border-gray-200 pt-3">
              <button
                type="button"
                class="flex items-center gap-1 rounded-sm bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                @click="$emit('enter-design')"
              >
                进入规划设计页
              </button>
              <button
                type="button"
                class="rounded-sm bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100"
                @click="$emit('open-copilot')"
              >
                自动协同修改
              </button>
            </div>
          </div>
        </div>

        <div v-else class="w-full space-y-1.5 pt-1.5">
          <div class="text-xs font-semibold text-gray-800">
            {{ message.role === 'user' ? 'User' : 'Lumina Agent' }}
          </div>
          <div class="text-[13px] leading-relaxed text-gray-800">
            {{ message.content }}
            <span
              v-if="message.streaming"
              class="ml-1 inline-block h-3 w-1 animate-pulse bg-cyan-500 align-middle"
            ></span>
          </div>
        </div>
      </div>
    </div>

    <div class="shrink-0 border-t border-gray-100 bg-white p-4">
      <div
        class="relative flex items-center rounded-md border border-gray-200 bg-gray-50 px-3 py-2 transition-all focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400"
      >
        <input
          :model-value="analysisInput"
          type="text"
          placeholder="输入补充需求或修改意见...第三次对话会触发计划生成"
          class="flex-1 border-none bg-transparent text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none"
          @input="$emit('update:analysis-input', ($event.target as HTMLInputElement).value)"
          @keydown.enter="$emit('send-analysis')"
        />
        <button
          type="button"
          class="p-1.5 text-gray-400 transition-colors hover:text-cyan-600 disabled:cursor-not-allowed disabled:text-gray-300"
          :disabled="isAnalysisStreaming || !analysisInput.trim()"
          @click="$emit('send-analysis')"
        >
          <Send :size="16" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Activity, Bot, Check, Send, UserCircle } from 'lucide-vue-next'
import type { SessionItem } from './generate-view.types'

defineProps<{
  session: SessionItem
  currentSessionStageLabel: string
  analysisInput: string
  isAnalysisStreaming: boolean
}>()

defineEmits<{
  (e: 'open-sessions'): void
  (e: 'open-copilot'): void
  (e: 'enter-design'): void
  (e: 'update:analysis-input', value: string): void
  (e: 'send-analysis'): void
}>()
</script>
