<script setup lang="ts">
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useAppStore } from '@/stores/appStore'
import CustomNode from './nodes/CustomNode.vue'

const store = useAppStore()

// 注册自定义节点
const nodeTypes = {
  custom: CustomNode,
}
</script>

<template>
  <div class="h-full w-full">
    <VueFlow
      v-model:nodes="store.configNodes"
      v-model:edges="store.configEdges"
      :node-types="nodeTypes"
      fit-view-on-init
      class="bg-gray-50"
    >
      <Background pattern-color="#aaa" gap="8" />
      <Controls />
      
      <!-- Panel用于显示标题 -->
      <div class="absolute top-4 left-4 z-10 bg-white p-2 rounded shadow">
        <h3 class="font-bold text-lg">Agent Workflow Configuration</h3>
        <p class="text-sm text-gray-500">Define planning, tools, and decision logic.</p>
      </div>
    </VueFlow>
  </div>
</template>

<style>
/* Vue Flow styles are imported globally or here */
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/controls/dist/style.css';
</style>
