<template>
  <div class="of-generate-design flex h-full flex-col bg-[#fcfcfd]">
    <div class="border-b border-gray-200 bg-white px-6 py-4">
      <div class="flex items-center justify-between gap-4">
        <div>
          <div class="text-[13px] font-semibold text-gray-800">规划设计页</div>
          <div class="mt-1 text-xs leading-5 text-gray-500">
            当前会话：{{ session.title }}，主内容为设计文档编辑器，右侧可用 auto copilot 协助修改并
            自动批准合并，同时保留 diff 回显。
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="rounded bg-emerald-50 px-2 py-1 text-[10px] text-emerald-700">
            {{ session.design.fileName }}
          </span>
          <button
            type="button"
            class="rounded border border-gray-200 px-2.5 py-1 text-[11px] text-gray-500 transition-colors hover:border-violet-200 hover:text-violet-600"
            @click="$emit('open-copilot')"
          >
            打开 Auto Copilot
          </button>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-6 py-5">
      <div class="mx-auto flex h-full max-w-5xl gap-6">
        <div class="flex min-h-0 flex-1 flex-col border border-gray-200 bg-white">
          <div
            class="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 px-4 py-2"
          >
            <div>
              <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">
                设计正文
              </div>
              <div class="mt-1 text-[11px] text-gray-400">
                可以先手改正文，再交给右侧 copilot 自动生成并合并修改。
              </div>
            </div>
            <button
              type="button"
              class="rounded-sm bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 transition-colors hover:bg-violet-100"
              @click="$emit('open-copilot')"
            >
              让 Copilot 优化
            </button>
          </div>

          <div class="flex-1 bg-[#fbfbfc] p-4">
            <textarea
              :value="designContent"
              class="h-full min-h-[520px] w-full resize-none border-none bg-transparent font-mono text-[12px] leading-6 text-gray-800 outline-none"
              placeholder="在这里编辑规划设计文档..."
              @input="$emit('update:design-content', ($event.target as HTMLTextAreaElement).value)"
            ></textarea>
          </div>
        </div>

        <div class="hidden w-72 shrink-0 border border-gray-200 bg-white xl:flex xl:flex-col">
          <div class="border-b border-gray-100 px-4 py-3">
            <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">设计摘要</div>
            <div class="mt-2 text-[13px] leading-6 text-gray-700">{{ session.design.summary }}</div>
          </div>
          <div class="flex-1 px-4 py-3">
            <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">建议动作</div>
            <div class="mt-3 space-y-2 text-[12px] text-gray-600">
              <div class="border-l-2 border-violet-300 pl-3">先完善模块目标与交互边界</div>
              <div class="border-l-2 border-cyan-300 pl-3">
                让 Copilot 生成结构化 diff 并自动合并
              </div>
              <div class="border-l-2 border-emerald-300 pl-3">自动合并后再进入校验阶段</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SessionItem } from './generate-view.types'

defineProps<{
  session: SessionItem
  designContent: string
}>()

defineEmits<{
  (e: 'update:design-content', value: string): void
  (e: 'open-copilot'): void
}>()
</script>
