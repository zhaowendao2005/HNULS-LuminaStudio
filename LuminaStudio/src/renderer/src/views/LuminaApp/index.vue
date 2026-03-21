<template>
  <div
    class="ls-app relative h-screen w-full overflow-hidden bg-[#f8fafc] font-sans text-slate-900 selection:bg-emerald-200 selection:text-emerald-900"
  >
    <template v-if="hasStarted">
      <CustomTitlebar class="relative z-50" />
      <div class="flex h-[calc(100vh-32px)] w-full flex-1">
        <Sidebar :active-tab="activeTab" @change-tab="handleChangeTab" />
        <div class="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <TopBar
            :active-tab="activeTabLabelMap[activeTab] || activeTab"
            :show-debug-button="activeTab === 'settings'"
            :debug-button-active="activeTab === 'settings' && settingsView === 'devpage'"
            @debug-click="handleEnterSettingsDevPage"
          />
          <main
            :class="[
              'relative flex-1 min-h-0 overflow-x-hidden overflow-y-auto',
              activeTab === 'settings' ? '' : 'px-6 pb-6'
            ]"
          >
            <DashboardView v-if="activeTab === 'dashboard'" />
            <NormalChat v-else-if="activeTab === 'normal-chat'" />
            <OrchestraFlowView
              v-else-if="activeTab === 'orchestraflow'"
              :reset-token="orchestraflowResetToken"
            />
            <McpWorkbenchView v-else-if="activeTab === 'mcp-workbench'" />
            <UserSettingView
              v-else-if="activeTab === 'settings'"
              v-model:view="settingsView"
              @back="handleSettingsBack"
            />
            <DashboardView v-else />
          </main>
        </div>
      </div>
    </template>

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
import OrchestraFlowView from './Maincontent/OrchestraFlowView/index.vue'
import UserSettingView from './Maincontent/UserSettingView/index.vue'
import McpWorkbenchView from './Maincontent/McpWorkbenchView/index.vue'

type LuminaAppTabId = 'dashboard' | 'normal-chat' | 'orchestraflow' | 'mcp-workbench' | 'settings'
type UserSettingViewId = 'main' | 'model-config' | 'api-keys' | 'devpage'

const hasStarted = ref(false)
const activeTab = ref<LuminaAppTabId>('dashboard')
const settingsView = ref<UserSettingViewId>('main')
const orchestraflowResetToken = ref(0)

const activeTabLabelMap: Record<LuminaAppTabId, string> = {
  dashboard: 'dashboard',
  'normal-chat': 'normal chat',
  orchestraflow: 'orchestraflow',
  'mcp-workbench': 'mcp workbench',
  settings: 'settings'
}

function handleChangeTab(nextTab: string) {
  if (nextTab === 'orchestraflow' && activeTab.value === 'orchestraflow') {
    orchestraflowResetToken.value += 1
    return
  }

  if (nextTab === 'settings') {
    activeTab.value = 'settings'
    return
  }

  activeTab.value = nextTab as LuminaAppTabId
}

function handleEnterSettingsDevPage() {
  activeTab.value = 'settings'
  settingsView.value = 'devpage'
}

function handleSettingsBack() {
  settingsView.value = 'main'
}
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
