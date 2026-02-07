<script setup lang="ts">
import { useAppStore } from '@/stores/appStore'
import { X } from 'lucide-vue-next'
import ConfigGraph from './ConfigGraph.vue'
import MonitorGraph from './MonitorGraph.vue'
import ConfigDrawer from './ConfigDrawer.vue'

const store = useAppStore()

const closePanel = () => {
  store.setPanel('none')
}
</script>

<template>
  <div v-if="store.activePanel !== 'none'" class="h-full flex flex-col bg-white relative">
    <!-- Header -->
    <div class="h-10 border-b flex items-center justify-between px-4 bg-gray-50">
      <span class="text-sm font-semibold text-gray-600 uppercase tracking-wider">
        {{ store.activePanel === 'config' ? 'Configuration' : 'Monitor' }}
      </span>
      <button @click="closePanel" class="hover:text-red-500 transition-colors">
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 relative overflow-hidden">
      <ConfigGraph v-if="store.activePanel === 'config'" />
      <MonitorGraph v-else-if="store.activePanel === 'monitor'" />

      <!-- Drawer Overlay -->
      <ConfigDrawer />
    </div>
  </div>
  <div v-else class="h-full flex items-center justify-center text-gray-400 bg-gray-50">
    <div class="text-center">
      <p>No active panel</p>
      <p class="text-sm">Select an action from the chat</p>
    </div>
  </div>
</template>
