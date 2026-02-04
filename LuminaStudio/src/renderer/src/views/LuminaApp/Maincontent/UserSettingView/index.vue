<template>
  <div class="usersetting-main-view flex flex-col h-full overflow-hidden">
    <!-- TopBar will be automatically added by MainContent -->

    <!-- 主视图 -->
    <div v-if="currentView === 'main'" class="usersetting-content flex-1 overflow-auto p-8">
      <div class="max-w-4xl mx-auto">
        <h1 class="usersetting-title text-2xl font-bold text-slate-900 mb-8">用户设置</h1>

        <!-- Model Management Entry -->
        <div class="usersetting-section mb-10">
          <div
            class="usersetting-section-content relative overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-slate-50/70"
            :style="modelCardStyle"
          >
            <div class="absolute inset-0 bg-white/60 backdrop-blur-sm"></div>
            <div
              class="relative p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
            >
              <div class="flex-1">
                <p class="usersetting-section-title text-lg font-semibold text-slate-800">
                  模型管理
                </p>
                <p class="usersetting-help-text mt-2 text-sm text-slate-600 max-w-2xl">
                  配置与管理可用的大模型来源、密钥与优先级，集中维护模型能力。
                </p>
              </div>
              <button
                type="button"
                class="usersetting-button inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
                @click="handleOpenModelConfig"
              >
                前往配置
              </button>
            </div>
          </div>
        </div>

        <!-- More sections can be added here in the future -->
      </div>
    </div>

    <!-- 模型配置子视图 -->
    <ModelConfigView v-else-if="currentView === 'model-config'" @back="handleBackToMain" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ModelConfigView from './ModelConfigView/index.vue'

const emit = defineEmits<{
  (e: 'openModelConfig'): void
  (e: 'enter-detail', name: string): void
  (e: 'leave-detail'): void
}>()

const currentView = ref<'main' | 'model-config'>('main')

const modelCardStyle = computed(() => ({
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='200' viewBox='0 0 320 200'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23eef2ff' stop-opacity='0.8'/%3E%3Cstop offset='100%25' stop-color='%23e0f2fe' stop-opacity='0.8'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cg fill='url(%23g)'%3E%3Cpolygon points='0,0 80,0 0,80'/%3E%3Cpolygon points='80,0 160,0 120,60'/%3E%3Cpolygon points='160,0 240,0 200,70'/%3E%3Cpolygon points='240,0 320,0 320,80'/%3E%3Cpolygon points='0,80 60,120 0,200'/%3E%3Cpolygon points='60,120 140,80 120,200'/%3E%3Cpolygon points='140,80 220,120 200,200'/%3E%3Cpolygon points='220,120 320,80 320,200'/%3E%3C/g%3E%3C/svg%3E\")",
  backgroundSize: 'cover',
  backgroundPosition: 'center'
}))

const handleOpenModelConfig = (): void => {
  currentView.value = 'model-config'
  emit('enter-detail', '模型管理')
}

const handleBackToMain = (): void => {
  currentView.value = 'main'
  emit('leave-detail')
}

// 暴露给父组件调用的方法（用于面包屑返回）
const handleBack = (): void => {
  if (currentView.value === 'model-config') {
    handleBackToMain()
  }
}

// 使用 defineExpose 暴露方法
defineExpose({
  handleBack
})
</script>

<style scoped>
/* Component-specific styles (if needed) will go here */
</style>
