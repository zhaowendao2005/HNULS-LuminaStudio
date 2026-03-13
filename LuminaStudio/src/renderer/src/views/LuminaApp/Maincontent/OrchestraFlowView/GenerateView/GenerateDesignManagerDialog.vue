<template>
  <div
    v-if="visible"
    class="of-generate-design-manager fixed inset-0 z-40 flex items-center justify-center p-6"
  >
    <div class="absolute inset-0 bg-black/20 backdrop-blur-sm" @click="$emit('close')"></div>
    <div
      class="relative flex h-[80vh] w-full max-w-5xl flex-col border border-gray-200 bg-white shadow-2xl"
    >
      <div class="flex items-center justify-between gap-4 border-b border-gray-200 px-6 py-4">
        <div class="min-w-0">
          <div class="text-sm font-semibold text-gray-800">规划设计稿管理</div>
          <div class="mt-1 text-xs leading-5 text-gray-500">
            <template v-if="planningTitle">当前仅查看工作稿：{{ planningTitle }}</template>
            <template v-else>当前展示全部规划设计稿</template>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <button
            v-if="planningDocumentId"
            type="button"
            class="rounded border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
            @click="$emit('create-from-current-planning')"
          >
            + 从当前工作稿新建
          </button>
          <button
            type="button"
            class="rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            @click="$emit('close')"
          >
            关闭
          </button>
        </div>
      </div>

      <div
        class="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 px-6 py-3"
      >
        <div class="text-xs text-gray-500">共 {{ documents.length }} 份设计稿</div>
        <button
          v-if="planningDocumentId"
          type="button"
          class="text-[11px] font-semibold text-cyan-700 transition-colors hover:text-cyan-800"
          @click="$emit('show-all')"
        >
          查看全部设计稿
        </button>
      </div>

      <div class="flex-1 overflow-y-auto">
        <div v-if="documents.length" class="flex flex-col">
          <div
            v-for="document in documents"
            :key="document.id"
            class="group flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4 transition-colors hover:bg-gray-50/60"
          >
            <div class="min-w-0 flex-1">
              <div class="mb-1 flex flex-wrap items-center gap-2">
                <span class="text-[13px] font-semibold text-gray-800">{{ document.title }}</span>
                <span class="rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                  V{{ document.version }}
                </span>
                <span
                  v-if="activeDesignDocumentId === document.id"
                  class="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
                >
                  当前显示中
                </span>
              </div>
              <div class="text-xs leading-5 text-gray-500">
                来源 message：{{ formatMessageId(document.planningSourceMessageId) }}
              </div>
              <div class="mt-1 text-xs leading-5 text-gray-500">
                来源工作稿：{{ resolvePlanningTitle(document.planningDocumentId) }}
              </div>
              <div class="mt-1 text-xs text-gray-400">
                更新时间：{{ formatTime(document.updatedAt) }}
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <button
                type="button"
                class="rounded border border-cyan-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-cyan-700 transition-colors hover:bg-cyan-50"
                @click="$emit('select', document.id)"
              >
                进入编辑
              </button>
              <button
                type="button"
                class="rounded border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-700 transition-colors hover:bg-rose-50"
                @click="$emit('delete', document.id)"
              >
                删除
              </button>
            </div>
          </div>
        </div>

        <div v-else class="flex h-full items-center justify-center px-6">
          <div class="max-w-sm text-center">
            <div class="text-sm font-semibold text-gray-800">当前没有可用的设计稿</div>
            <div class="mt-2 text-xs leading-6 text-gray-500">
              <template v-if="planningDocumentId">
                可以从当前 planning 工作稿直接创建第一份规划设计稿。
              </template>
              <template v-else>请先从需求分析与计划中的 planning block 发起规划设计。</template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { GenerationDesignDocument, GenerationPlanningDocument } from '@preload/types'

const props = defineProps<{
  visible: boolean
  documents: GenerationDesignDocument[]
  planningDocumentId: string | null
  planningDocuments: Record<string, GenerationPlanningDocument>
  activeDesignDocumentId: string | null
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'show-all'): void
  (e: 'select', designDocumentId: string): void
  (e: 'delete', designDocumentId: string): void
  (e: 'create-from-current-planning'): void
}>()

const planningTitle = computed(() => {
  if (!props.planningDocumentId) {
    return null
  }
  return props.planningDocuments[props.planningDocumentId]?.title || null
})

function resolvePlanningTitle(planningDocumentId: string): string {
  return props.planningDocuments[planningDocumentId]?.title || planningDocumentId
}

function formatMessageId(messageId: string): string {
  return messageId.slice(0, 8)
}

function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>
