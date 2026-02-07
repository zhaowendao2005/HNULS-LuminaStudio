<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { computed } from 'vue'
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Settings,
  Search,
  Database,
  BrainCircuit,
} from 'lucide-vue-next'

const props = defineProps(['data'])

const statusColor = computed(() => {
  if (props.data.status === 'completed') return 'bg-green-100 border-green-500 text-green-700'
  if (props.data.status === 'running') return 'bg-blue-100 border-blue-500 text-blue-700'
  if (props.data.status === 'waiting') return 'bg-yellow-100 border-yellow-500 text-yellow-700'
  if (props.data.status === 'error') return 'bg-red-100 border-red-500 text-red-700'
  return 'bg-white border-gray-300 text-gray-800' // default
})

const typeIcon = computed(() => {
  switch (props.data.type) {
    case 'tool':
      return Search
    case 'decision':
      return BrainCircuit
    case 'process':
      return Settings
    case 'mcp':
      return Database
    default:
      return Settings
  }
})
</script>

<template>
  <div class="custom-node px-4 py-2 shadow-md rounded-md border-2" :class="statusColor">
    <Handle type="target" :position="Position.Top" class="w-3 h-3 !bg-gray-400" />

    <div class="flex items-center gap-2">
      <component :is="typeIcon" class="w-4 h-4" />
      <div class="font-bold text-sm">{{ data.label }}</div>
    </div>

    <div v-if="data.status" class="mt-1 flex items-center gap-1 text-xs opacity-80">
      <CheckCircle v-if="data.status === 'completed'" class="w-3 h-3" />
      <Clock v-if="data.status === 'waiting' || data.status === 'running'" class="w-3 h-3" />
      <AlertCircle v-if="data.status === 'error'" class="w-3 h-3" />
      <span>{{ data.status }}</span>
    </div>

    <Handle type="source" :position="Position.Bottom" class="w-3 h-3 !bg-gray-400" />
  </div>
</template>

<style scoped>
.custom-node {
  min-width: 150px;
}
</style>
