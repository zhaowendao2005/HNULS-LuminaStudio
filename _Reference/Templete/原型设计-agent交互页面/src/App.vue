<script setup lang="ts">
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
import ChatPanel from './components/ChatPanel.vue'
import RightPanel from './components/RightPanel.vue'
import { useAppStore } from './stores/appStore'

const store = useAppStore()
</script>

<template>
  <div class="h-screen w-screen overflow-hidden">
    <Splitpanes class="default-theme">
      <!-- Left Panel: Chat -->
      <Pane min-size="20" size="30">
        <ChatPanel />
      </Pane>

      <!-- Right Panel: Dynamic Content -->
      <Pane min-size="0" :size="store.activePanel === 'none' ? 0 : 70">
        <RightPanel />
      </Pane>
    </Splitpanes>
  </div>
</template>

<style>
/* Custom splitpanes styles */
.splitpanes__splitter {
  background-color: #e5e7eb;
  width: 4px;
  border-left: 1px solid #d1d5db;
  border-right: 1px solid #d1d5db;
}

.splitpanes__splitter:hover {
  background-color: #3b82f6;
}
</style>
