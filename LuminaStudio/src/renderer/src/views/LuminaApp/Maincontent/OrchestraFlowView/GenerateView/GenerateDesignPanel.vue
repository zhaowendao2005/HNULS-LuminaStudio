<template>
  <section class="gv-design-f18 flex h-full flex-col p-5">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <div class="text-sm font-semibold text-slate-900">Design Planner</div>
        <div class="text-xs text-slate-500">最终作者态统一为 TOML，并实时显示校验状态。</div>
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          @click="$emit('create-design')"
        >
          新建设计稿
        </button>
        <button
          type="button"
          class="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
          @click="$emit('compile-workflow')"
        >
          编译为工作流
        </button>
      </div>
    </div>

    <div class="mb-3 flex gap-2 overflow-x-auto">
      <button
        v-for="document in documents"
        :key="document.id"
        type="button"
        class="rounded-xl border px-3 py-2 text-left text-sm"
        :class="
          activeDocument?.id === document.id
            ? 'border-cyan-500 bg-cyan-50 text-cyan-900'
            : 'border-slate-200 bg-white text-slate-600'
        "
        @click="$emit('select-document', document.id)"
      >
        <div class="font-semibold">{{ document.title }}</div>
        <div class="text-xs opacity-70">v{{ document.version }} · {{ document.status }}</div>
      </button>
    </div>

    <div v-if="activeDocument" class="rounded-2xl border border-slate-200 bg-white p-4">
      <div class="mb-2 flex items-center justify-between">
        <div>
          <div class="text-sm font-semibold text-slate-900">{{ activeDocument.title }}</div>
          <div class="text-xs text-slate-500">{{ activeDocument.summary }}</div>
        </div>
        <button
          type="button"
          class="rounded-lg px-2 py-1 text-xs text-rose-500 hover:bg-rose-50"
          @click="$emit('delete-document', activeDocument.id)"
        >
          删除
        </button>
      </div>
      <textarea
        class="min-h-[320px] w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-sm text-slate-700 focus:outline-none"
        :value="activeDocument.content"
        @input="$emit('update:content', ($event.target as HTMLTextAreaElement).value)"
      ></textarea>
      <div class="mt-2 rounded-xl bg-slate-950 p-3 text-xs text-slate-200">
        <div class="mb-2 font-semibold text-white">Validation JSON</div>
        <pre class="whitespace-pre-wrap">{{ activeDocument.validationJson || '尚未校验。' }}</pre>
      </div>
    </div>

    <div v-else class="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
      还没有设计稿，先在 analysis 阶段整理需求后再创建。
    </div>

    <div class="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div class="mb-2 text-sm font-semibold text-slate-900">Design 对话</div>
      <div class="mb-3 max-h-[180px] overflow-y-auto rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
        <div v-for="message in designMessages" :key="message.id" class="mb-3 last:mb-0">
          <div class="mb-1 text-[11px] uppercase tracking-[0.24em] text-slate-400">
            {{ message.role }}
          </div>
          <div class="whitespace-pre-wrap">{{ message.content || '...' }}</div>
        </div>
      </div>
      <textarea
        class="min-h-[96px] w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-700 focus:outline-none"
        :value="designInput"
        placeholder="例如：生成含 start / llm / end 的摘要工作流..."
        @input="$emit('update:design-input', ($event.target as HTMLTextAreaElement).value)"
      ></textarea>
      <button
        type="button"
        class="mt-3 rounded-lg bg-cyan-600 px-3 py-2 text-sm text-white hover:bg-cyan-500"
        @click="$emit('send-design')"
      >
        发送给 Design Planner
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { GenerationDesignDocument, GenerationMessage } from '@preload/types'

defineProps<{
  documents: GenerationDesignDocument[]
  activeDocument: GenerationDesignDocument | null
  designMessages: GenerationMessage[]
  designInput: string
}>()

defineEmits<{
  (e: 'create-design'): void
  (e: 'compile-workflow'): void
  (e: 'select-document', documentId: string): void
  (e: 'delete-document', documentId: string): void
  (e: 'update:content', value: string): void
  (e: 'update:design-input', value: string): void
  (e: 'send-design'): void
}>()
</script>
