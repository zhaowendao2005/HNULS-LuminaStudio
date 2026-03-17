<template>
  <div class="of-generate-dashboard mx-auto max-w-5xl space-y-6 p-6">
    <h2 class="mb-4 text-sm font-semibold text-gray-800">系统概览 Dashboard</h2>

    <div class="grid grid-cols-3 gap-4">
      <div class="group relative overflow-hidden border border-gray-100 p-4">
        <div class="mb-1 text-xs text-gray-500">活跃会话数</div>
        <div class="text-2xl font-bold text-gray-800">{{ sessionsCount }}</div>
        <div
          class="absolute bottom-0 left-0 h-1 w-1/3 bg-emerald-500 transition-all group-hover:w-full"
        ></div>
      </div>
      <div class="group relative overflow-hidden border border-gray-100 p-4">
        <div class="mb-1 text-xs text-gray-500">已生成设计稿的会话</div>
        <div class="text-2xl font-bold text-gray-800">{{ plannedSessionsCount }}</div>
        <div
          class="absolute bottom-0 left-0 h-1 w-2/3 bg-cyan-500 transition-all group-hover:w-full"
        ></div>
      </div>
      <div class="group relative overflow-hidden border border-gray-100 p-4">
        <div class="mb-1 text-xs text-gray-500">当前阶段</div>
        <div class="text-2xl font-bold text-gray-800">{{ currentSessionStageLabel }}</div>
        <div
          class="absolute bottom-0 left-0 h-1 w-1/2 bg-violet-500 transition-all group-hover:w-full"
        ></div>
      </div>
    </div>

    <div class="mt-6 border border-gray-100 p-5">
      <div class="mb-6 flex items-center justify-between">
        <h3 class="text-[13px] font-semibold text-gray-800">会话阶段分布</h3>
        <div class="flex gap-2">
          <span class="flex items-center gap-1 text-[10px] uppercase text-gray-500">
            <span class="h-2 w-2 rounded-full bg-cyan-500"></span>
            分析
          </span>
          <span class="flex items-center gap-1 text-[10px] uppercase text-gray-500">
            <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
            设计
          </span>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4 text-[13px] text-gray-700">
        <div
          v-for="item in dashboardStageCards"
          :key="item.stageKey"
          class="border border-gray-100 bg-gray-50/60 p-4"
        >
          <div class="mb-1 flex items-center gap-2 text-xs text-gray-500">
            <span :class="['h-2.5 w-2.5 rounded-full', item.color]"></span>
            {{ item.title }}
          </div>
          <div class="text-xl font-semibold text-gray-800">{{ item.count }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DashboardStageCard } from './generate-view.types'

defineProps<{
  sessionsCount: number
  plannedSessionsCount: number
  currentSessionStageLabel: string
  dashboardStageCards: DashboardStageCard[]
}>()
</script>
