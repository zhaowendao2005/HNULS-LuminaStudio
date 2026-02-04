<template>
  <div v-if="!hasStarted">
    <WelcomeScreen @start="hasStarted = true" />
  </div>
  <div v-else class="ls-app flex h-screen w-full bg-[#f8fafc] font-sans text-slate-900 overflow-hidden selection:bg-emerald-200 selection:text-emerald-900">
    <Sidebar :active-tab="activeTab" @change-tab="activeTab = $event" />
    <div class="flex-1 flex flex-col h-full overflow-hidden relative">
      <TopBar :active-tab="activeTab" />
      <main class="flex-1 p-6 overflow-y-auto overflow-x-hidden relative">
        <DashboardView v-if="activeTab === 'dashboard'" />
        <NormalChat v-else-if="activeTab === 'normal-chat'" />
        <ReaderView v-else-if="activeTab === 'reader'" />
        <GraphView v-else-if="activeTab === 'graph'" />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import WelcomeScreen from './WelcomeScreen/index.vue'
import Sidebar from './Sidebar/index.vue'
import TopBar from './TopBar/index.vue'
import DashboardView from './Maincontent/DashboardView/index.vue'
import NormalChat from './Maincontent/NormalChat/index.vue'
import ReaderView from './Maincontent/ReaderView/index.vue'
import GraphView from './Maincontent/GraphView/index.vue'

const hasStarted = ref(false)
const activeTab = ref('dashboard')
</script>

<style scoped>
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #d1fae5;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #10b981;
}
</style>
