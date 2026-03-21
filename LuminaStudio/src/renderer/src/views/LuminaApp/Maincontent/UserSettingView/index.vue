<template>
  <div class="usersetting-main-view flex h-full flex-col overflow-hidden">
    <!-- TopBar will be automatically added by MainContent -->

    <!-- 主视图 -->
    <div v-if="currentView === 'main'" class="usersetting-content flex-1 overflow-auto p-8">
      <div class="mx-auto max-w-4xl">
        <h1 class="usersetting-title mb-8 text-2xl font-bold text-slate-900">用户设置</h1>

        <!-- Model Management Entry -->
        <div class="usersetting-section mb-10">
          <div
            class="usersetting-section-content relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 shadow-sm"
            :style="modelCardStyle"
          >
            <div class="absolute inset-0 bg-white/60 backdrop-blur-sm"></div>
            <div
              class="relative flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
            >
              <div class="flex-1">
                <p class="usersetting-section-title text-lg font-semibold text-slate-800">
                  模型管理
                </p>
                <p class="usersetting-help-text mt-2 max-w-2xl text-sm text-slate-600">
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

        <!-- API Keys Management Entry -->
        <div class="usersetting-section mb-10">
          <div
            class="usersetting-section-content relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 shadow-sm"
            :style="apiKeysCardStyle"
          >
            <div class="absolute inset-0 bg-white/60 backdrop-blur-sm"></div>
            <div
              class="relative flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
            >
              <div class="flex-1">
                <p class="usersetting-section-title text-lg font-semibold text-slate-800">
                  秘钥管理
                </p>
                <p class="usersetting-help-text mt-2 max-w-2xl text-sm text-slate-600">
                  配置与管理外部服务 API 密钥，如 PubMed、Arxiv 等文献检索服务。
                </p>
              </div>
              <button
                type="button"
                class="usersetting-button inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                @click="handleOpenApiKeys"
              >
                前往配置
              </button>
            </div>
          </div>
        </div>

        <!-- Debug workbench entry -->
        <div class="usersetting-section">
          <div
            class="usersetting-section-content relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 shadow-sm"
            :style="devPageCardStyle"
          >
            <div class="absolute inset-0 bg-white/60 backdrop-blur-sm"></div>
            <div
              class="relative flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
            >
              <div class="flex-1">
                <p class="usersetting-section-title text-lg font-semibold text-slate-800">
                  调试工作台
                </p>
                <p class="usersetting-help-text mt-2 max-w-2xl text-sm text-slate-600">
                  用于知识检索调试、服务健康检查和响应检查的内部工具页。
                </p>
              </div>
              <button
                type="button"
                class="usersetting-button inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1"
                @click="handleOpenDevPage"
              >
                打开调试页
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 模型配置子视图 -->
    <ModelConfigView v-else-if="currentView === 'model-config'" @back="handleBackToMain" />

    <!-- API Keys 管理子视图 -->
    <ApiKeysConfigView v-else-if="currentView === 'api-keys'" @back="handleBackToMain" />

    <!-- 调试工作台 -->
    <DevPageView v-else-if="currentView === 'devpage'" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ModelConfigView from './ModelConfigView/index.vue'
import ApiKeysConfigView from './ApiKeysConfigView/index.vue'
import DevPageView from '../devpage/index.vue'

type UserSettingViewId = 'main' | 'model-config' | 'api-keys' | 'devpage'

const props = defineProps<{
  view: UserSettingViewId
}>()

const emit = defineEmits<{
  (e: 'update:view', value: UserSettingViewId): void
  (e: 'back'): void
}>()

const currentView = computed(() => props.view)

const modelCardStyle = computed(() => ({
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='200' viewBox='0 0 320 200'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23eef2ff' stop-opacity='0.8'/%3E%3Cstop offset='100%25' stop-color='%23e0f2fe' stop-opacity='0.8'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cg fill='url(%23g)'%3E%3Cpolygon points='0,0 80,0 0,80'/%3E%3Cpolygon points='80,0 160,0 120,60'/%3E%3Cpolygon points='160,0 240,0 200,70'/%3E%3Cpolygon points='240,0 320,0 320,80'/%3E%3Cpolygon points='0,80 60,120 0,200'/%3E%3Cpolygon points='60,120 140,80 120,200'/%3E%3Cpolygon points='140,80 220,120 200,200'/%3E%3Cpolygon points='220,120 320,80 320,200'/%3E%3C/g%3E%3C/svg%3E\")",
  backgroundSize: 'cover',
  backgroundPosition: 'center'
}))

const apiKeysCardStyle = computed(() => ({
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='200' viewBox='0 0 320 200'%3E%3Cdefs%3E%3ClinearGradient id='g2' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23dbeafe' stop-opacity='0.8'/%3E%3Cstop offset='100%25' stop-color='%23e0e7ff' stop-opacity='0.8'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cg fill='url(%23g2)'%3E%3Crect x='0' y='0' width='80' height='80'/%3E%3Crect x='80' y='40' width='60' height='60'/%3E%3Crect x='140' y='80' width='80' height='80'/%3E%3Crect x='220' y='20' width='100' height='100'/%3E%3C/g%3E%3C/svg%3E\")",
  backgroundSize: 'cover',
  backgroundPosition: 'center'
}))

const devPageCardStyle = computed(() => ({
  backgroundImage:
    "linear-gradient(135deg, rgba(15,23,42,0.08), rgba(16,185,129,0.10)), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='200' viewBox='0 0 320 200'%3E%3Crect x='0' y='0' width='320' height='200' fill='%23f8fafc'/%3E%3Cg fill='%23cbd5e1' fill-opacity='0.55'%3E%3Ccircle cx='52' cy='52' r='24'/%3E%3Ccircle cx='120' cy='52' r='12'/%3E%3Ccircle cx='196' cy='48' r='16'/%3E%3Ccircle cx='268' cy='52' r='20'/%3E%3Ccircle cx='92' cy='136' r='18'/%3E%3Ccircle cx='176' cy='136' r='30'/%3E%3Ccircle cx='260' cy='136' r='14'/%3E%3C/g%3E%3C/svg%3E\")",
  backgroundSize: 'cover',
  backgroundPosition: 'center'
}))

function handleOpenModelConfig(): void {
  emit('update:view', 'model-config')
}

function handleOpenApiKeys(): void {
  emit('update:view', 'api-keys')
}

function handleOpenDevPage(): void {
  emit('update:view', 'devpage')
}

function handleBackToMain(): void {
  emit('update:view', 'main')
  emit('back')
}

defineExpose({
  handleBack: handleBackToMain
})
</script>

<style scoped>
/* 该壳体主要由 Tailwind 承担，保留空样式以便后续局部微调。 */
</style>
