<template>
  <section class="gv-analysis-r77 flex h-full flex-col p-5">
    <div class="mb-4">
      <div class="text-sm font-semibold text-slate-900">Analysis Planner</div>
      <div class="text-xs text-slate-500">需求分析文档与 planning patch 都在这一阶段完成。</div>
    </div>

    <div class="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div class="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
        当前分析文档
      </div>
      <textarea
        class="min-h-[240px] w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-sm text-slate-700 focus:outline-none"
        :value="document.content"
        @input="$emit('update:document', ($event.target as HTMLTextAreaElement).value)"
      ></textarea>
      <div class="mt-2 text-xs text-slate-500">{{ document.summary }}</div>
    </div>

    <div class="mb-4 grid gap-3 md:grid-cols-2">
      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <div class="mb-2 text-sm font-semibold text-slate-900">Analysis 对话</div>
        <div class="mb-3 max-h-[180px] overflow-y-auto rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          <div v-for="message in analysisMessages" :key="message.id" class="mb-3 last:mb-0">
            <div class="mb-1 text-[11px] uppercase tracking-[0.24em] text-slate-400">
              {{ message.role }}
            </div>
            <div class="whitespace-pre-wrap">{{ message.content || '...' }}</div>
          </div>
        </div>
        <textarea
          class="min-h-[96px] w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-700 focus:outline-none"
          :value="analysisInput"
          placeholder="输入本轮需求、约束或目标..."
          @input="$emit('update:analysis-input', ($event.target as HTMLTextAreaElement).value)"
        ></textarea>
        <button
          type="button"
          class="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
          @click="$emit('send-analysis')"
        >
          发送给 Analysis Planner
        </button>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <div class="mb-2 text-sm font-semibold text-slate-900">Planning Copilot</div>
        <div class="mb-3 max-h-[180px] overflow-y-auto rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          <div v-for="message in planningMessages" :key="message.id" class="mb-3 last:mb-0">
            <div class="mb-1 text-[11px] uppercase tracking-[0.24em] text-slate-400">
              {{ message.role }}
            </div>
            <div class="whitespace-pre-wrap">{{ message.content || '...' }}</div>
          </div>
        </div>
        <textarea
          class="min-h-[96px] w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-700 focus:outline-none"
          :value="planningInput"
          placeholder="例如：把成功标准补成可测试指标..."
          @input="$emit('update:planning-input', ($event.target as HTMLTextAreaElement).value)"
        ></textarea>
        <div class="mt-3 flex gap-2">
          <button
            type="button"
            class="rounded-lg bg-cyan-600 px-3 py-2 text-sm text-white hover:bg-cyan-500"
            @click="$emit('send-planning')"
          >
            发送给 Planning Copilot
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            @click="$emit('create-design')"
          >
            建立设计稿
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { GenerationAnalysisDocument, GenerationMessage } from '@preload/types'

defineProps<{
  document: GenerationAnalysisDocument
  analysisMessages: GenerationMessage[]
  planningMessages: GenerationMessage[]
  analysisInput: string
  planningInput: string
}>()

defineEmits<{
  (e: 'update:document', value: string): void
  (e: 'update:analysis-input', value: string): void
  (e: 'update:planning-input', value: string): void
  (e: 'send-analysis'): void
  (e: 'send-planning'): void
  (e: 'create-design'): void
}>()
</script>
