<script setup lang="ts">
import { useAppStore } from '@/stores/appStore'
import { X, Save } from 'lucide-vue-next'

const store = useAppStore()

const close = () => {
  store.closeDrawer()
}

const save = () => {
  // Mock save action
  store.closeDrawer()
}
</script>

<template>
  <div
    v-if="store.isDrawerOpen"
    class="absolute top-0 right-0 h-full w-80 bg-white shadow-2xl border-l z-20 flex flex-col transition-transform transform"
  >
    <!-- Header -->
    <div class="p-4 border-b flex justify-between items-center bg-gray-50">
      <h3 class="font-bold text-lg">Node Configuration</h3>
      <button @click="close" class="text-gray-500 hover:text-red-500">
        <X class="w-5 h-5" />
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-4 space-y-6">
      <div v-if="store.selectedNode">
        <!-- Basic Info -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Node ID</label>
          <input
            type="text"
            :value="store.selectedNode.id"
            disabled
            class="w-full px-3 py-2 border rounded-md bg-gray-100 text-gray-500"
          />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Label</label>
          <input
            type="text"
            v-model="store.selectedNode.data.label"
            class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Type</label>
          <select
            v-model="store.selectedNode.data.type"
            class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="start">Start</option>
            <option value="process">Process/Plan</option>
            <option value="tool">Tool</option>
            <option value="mcp">MCP</option>
            <option value="decision">Decision</option>
          </select>
        </div>

        <!-- Dynamic Config Form based on type -->
        <div class="border-t pt-4 mt-4">
          <h4 class="font-semibold text-gray-900 mb-3">Parameters</h4>

          <template v-if="store.selectedNode.data.config">
            <div
              v-for="(value, key) in store.selectedNode.data.config"
              :key="key"
              class="space-y-1 mb-3"
            >
              <label class="block text-sm font-medium text-gray-700 capitalize">{{ key }}</label>
              <input
                type="text"
                v-model="store.selectedNode.data.config[key]"
                class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </template>
          <div v-else class="text-sm text-gray-500 italic">
            No specific configuration for this node type.
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="p-4 border-t bg-gray-50 flex justify-end gap-2">
      <button @click="close" class="px-4 py-2 border rounded-md hover:bg-gray-100">Cancel</button>
      <button
        @click="save"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
      >
        <Save class="w-4 h-4" /> Save
      </button>
    </div>
  </div>
</template>
