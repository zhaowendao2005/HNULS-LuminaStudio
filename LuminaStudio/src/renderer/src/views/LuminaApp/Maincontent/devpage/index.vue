<template>
  <div class="us-devpage flex h-full min-h-0 flex-col overflow-hidden">
    <section class="us-devpage-shell flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4">
      <header
        class="us-devpage-card flex flex-col gap-4 rounded-3xl border px-5 py-4 shadow-sm backdrop-blur-md"
      >
        <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">
              Settings DevPage
            </p>
            <h1 class="text-2xl font-semibold text-slate-900">用户设置调试工作台</h1>
            <p class="max-w-3xl text-sm leading-6 text-slate-500">
              这里是设置域内的内部调试入口，提供知识检索调试、服务健康和知识图谱检索三个分区。
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <span
              class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
            >
              默认页：知识检索调试
            </span>
            <span
              class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
            >
              仅 settings 可见
            </span>
          </div>
        </div>

        <div class="flex flex-wrap gap-2 rounded-2xl bg-slate-100/70 p-2">
          <button
            v-for="tab in devPageTabs"
            :key="tab.id"
            type="button"
            class="flex min-w-[12rem] flex-1 flex-col rounded-xl border px-4 py-3 text-left transition-all"
            :class="
              currentTabId === tab.id
                ? 'border-emerald-200 bg-white text-slate-900 shadow-sm'
                : 'border-transparent bg-white/0 text-slate-500 hover:border-slate-200 hover:bg-white/70 hover:text-slate-800'
            "
            @click="currentTabId = tab.id"
          >
            <span class="text-sm font-semibold">{{ tab.label }}</span>
            <span class="mt-1 text-xs leading-5">{{ tab.description }}</span>
          </button>
        </div>
      </header>

      <main
        class="us-devpage-card us-devpage-body flex min-h-0 flex-1 overflow-hidden rounded-3xl border shadow-sm"
      >
        <component :is="currentTab.component" :key="currentTabId" class="min-h-0 flex-1" />
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { defaultDevPageTabId, devPageTabs } from './index.ts'
import './index.scss'

const currentTabId = ref(defaultDevPageTabId)

const currentTab = computed(() => {
  return devPageTabs.find((tab) => tab.id === currentTabId.value) ?? devPageTabs[0]
})
</script>
