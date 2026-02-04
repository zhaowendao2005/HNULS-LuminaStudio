<template>
  <div
    class="ls-app relative h-screen w-full bg-[#f8fafc] font-sans text-slate-900 overflow-hidden selection:bg-emerald-200 selection:text-emerald-900"
  >
    <!-- 主界面内容（包含标题栏） -->
    <template v-if="hasStarted">
      <CustomTitlebar class="relative z-50" />
      <div class="flex flex-1 h-[calc(100vh-32px)] w-full">
      <Sidebar :active-tab="activeTab" @change-tab="activeTab = $event" />
      <div class="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        <TopBar :active-tab="activeTab" />
        <main class="flex-1 min-h-0 p-6 overflow-y-auto overflow-x-hidden relative">
          <DashboardView v-if="activeTab === 'dashboard'" />
          <NormalChat v-else-if="activeTab === 'normal-chat'" />
          <ReaderView v-else-if="activeTab === 'reader'" />
          <GraphView v-else-if="activeTab === 'graph'" />
        </main>
      </div>
    </div>
    </template>

    <!-- 欢迎页：全屏并带有自己的轻量标题栏 -->
    <Transition name="welcome-fade">
      <WelcomeScreen v-if="!hasStarted" @start="hasStarted = true" />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import WelcomeScreen from './WelcomeScreen/index.vue'
import Sidebar from './Sidebar/index.vue'
import TopBar from './TopBar/index.vue'
import CustomTitlebar from './components/CustomTitlebar/index.vue'
import DashboardView from './Maincontent/DashboardView/index.vue'
import NormalChat from './Maincontent/NormalChat/index.vue'
import ReaderView from './Maincontent/ReaderView/index.vue'
import GraphView from './Maincontent/GraphView/index.vue'

const hasStarted = ref(false)
const activeTab = ref('dashboard')
</script>

<style scoped>
.welcome-fade-enter-active,
.welcome-fade-leave-active {
  transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.welcome-fade-enter-from,
.welcome-fade-leave-to {
  opacity: 0;
}

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
