<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '@/stores/appStore'
import { Send, Settings, Activity } from 'lucide-vue-next'

const store = useAppStore()
const inputContent = ref('')

const sendMessage = () => {
  if (!inputContent.value.trim()) return

  store.addMessage('user', inputContent.value)

  // 模拟回复
  setTimeout(() => {
    store.addMessage(
      'agent',
      'I received your request: "' + inputContent.value + '". I will start analyzing now.',
    )
    store.setPanel('monitor') // 自动切到监控
    store.startMonitoring()
  }, 500)

  inputContent.value = ''
}

const openConfig = () => {
  store.setPanel('config')
}

const openMonitor = () => {
  store.setPanel('monitor')
}
</script>

<template>
  <div class="flex flex-col h-full bg-white border-r">
    <!-- Header -->
    <div class="h-14 border-b flex items-center justify-between px-4 bg-gray-50">
      <h2 class="font-bold text-gray-700">Lumina Agent</h2>
      <button
        @click="openConfig"
        class="p-2 hover:bg-gray-200 rounded-full transition-colors"
        title="Configure Agent Workflow"
      >
        <Settings class="w-5 h-5 text-gray-600" />
      </button>
    </div>

    <!-- Chat Area -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <div
        v-for="(msg, index) in store.messages"
        :key="index"
        class="flex flex-col"
        :class="msg.role === 'user' ? 'items-end' : 'items-start'"
      >
        <div
          class="max-w-[80%] p-3 rounded-lg text-sm shadow-sm"
          :class="
            msg.role === 'user'
              ? 'bg-blue-600 text-white rounded-br-none'
              : 'bg-gray-100 text-gray-800 rounded-bl-none'
          "
        >
          {{ msg.content }}
        </div>

        <!-- Agent消息下的操作按钮 -->
        <div v-if="msg.role === 'agent'" class="mt-1">
          <button
            @click="openMonitor"
            class="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            <Activity class="w-3 h-3" /> View Execution Trace
          </button>
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="p-4 border-t bg-gray-50">
      <div class="flex gap-2">
        <input
          v-model="inputContent"
          @keyup.enter="sendMessage"
          type="text"
          placeholder="Type your instruction..."
          class="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          @click="sendMessage"
          class="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          <Send class="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
</template>
