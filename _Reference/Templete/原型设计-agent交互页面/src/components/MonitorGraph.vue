<script setup lang="ts">
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useAppStore } from '@/stores/appStore'
import CustomNode from './nodes/CustomNode.vue'

const store = useAppStore()

const nodeTypes = {
  custom: CustomNode,
}
</script>

<template>
  <div class="h-full w-full">
    <VueFlow
      v-model:nodes="store.monitorNodes"
      v-model:edges="store.monitorEdges"
      :node-types="nodeTypes"
      fit-view-on-init
      class="bg-gray-50"
    >
      <Background pattern-color="#aaa" gap="8" />
      <Controls />

      <div class="absolute top-4 left-4 z-10 bg-white p-2 rounded shadow">
        <h3 class="font-bold text-lg text-blue-600">Live Agent Monitor</h3>
        <p class="text-sm text-gray-500">Real-time execution trace & user feedback.</p>
      </div>
    </VueFlow>
  </div>
</template>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/controls/dist/style.css';
</style>
