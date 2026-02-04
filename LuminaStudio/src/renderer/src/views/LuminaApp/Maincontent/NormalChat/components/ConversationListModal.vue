<template>
  <!-- nc_ConversationList_Root_a8d3: 对话列表对话框根容器 -->
  <div v-if="visible" class="nc_ConversationList_Root_a8d3 fixed inset-0 z-50 flex items-center justify-center p-8">
    <!-- Backdrop -->
    <div 
      class="absolute inset-0 bg-black/20 backdrop-blur-sm" 
      style="animation: fadeIn 0.3s ease-out;"
      @click="$emit('update:visible', false)"
    ></div>

    <!-- nc_ConversationList_Content_a8d3: 对话框内容容器 -->
    <div 
      class="nc_ConversationList_Content_a8d3 relative w-full h-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-100 flex overflow-hidden"
      style="
        animation: slideUpBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      "
    >
      <!-- nc_ConversationList_Sidebar_a8d3: 左侧 Agent 列表 -->
      <div class="nc_ConversationList_Sidebar_a8d3 w-64 bg-slate-50 border-r border-slate-100 flex flex-col">
        <div class="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">智能助手 (Agents)</h3>
        </div>
        
        <div class="flex-1 overflow-y-auto p-3 space-y-1">
          <button
            v-for="agent in agents"
            :key="agent.id"
            @click="selectedAgentId = agent.id"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group"
            :class="selectedAgentId === agent.id ? 'bg-white shadow-sm ring-1 ring-slate-100' : 'hover:bg-slate-100'"
          >
            <div 
              class="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm"
              :class="agent.color"
            >
              {{ agent.name[0] }}
            </div>
            <div class="text-left flex-1 min-w-0">
              <div class="text-sm font-medium text-slate-700 truncate">{{ agent.name }}</div>
              <div class="text-[10px] text-slate-400 truncate">{{ agent.role }}</div>
            </div>
          </button>
        </div>
        
        <div class="p-3 border-t border-slate-100">
          <button class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:text-emerald-600 hover:border-emerald-200 transition-colors">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            新建助手
          </button>
        </div>
      </div>

      <!-- nc_ConversationList_Main_a8d3: 右侧对话历史列表 -->
      <div class="nc_ConversationList_Main_a8d3 flex-1 flex flex-col bg-white">
        <!-- Header -->
        <div class="h-16 flex items-center justify-between px-6 border-b border-slate-100">
          <h2 class="text-lg font-semibold text-slate-800">对话历史</h2>
          <div class="relative w-64">
            <svg class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input 
              type="text" 
              placeholder="搜索对话记录..." 
              class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        <!-- List -->
        <div class="flex-1 overflow-y-auto p-6">
          <div v-if="currentAgentConversations.length > 0" class="space-y-3">
            <div 
              v-for="conv in currentAgentConversations" 
              :key="conv.id"
              class="group flex items-start gap-4 p-4 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-500/5 transition-all cursor-pointer bg-white"
              @click="$emit('select', conv); $emit('update:visible', false)"
            >
              <div class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-50 transition-colors">
                 <svg class="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                   <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                 </svg>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-1">
                  <h4 class="text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors truncate">
                    {{ conv.title }}
                  </h4>
                  <span class="text-[10px] text-slate-400">{{ conv.time }}</span>
                </div>
                <p class="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {{ conv.preview }}
                </p>
                <div class="flex items-center gap-2 mt-3">
                  <span class="px-2 py-0.5 rounded-md bg-slate-50 text-[10px] text-slate-400 border border-slate-100">
                    {{ conv.model }}
                  </span>
                  <span class="px-2 py-0.5 rounded-md bg-slate-50 text-[10px] text-slate-400 border border-slate-100">
                    {{ conv.messagesCount }} 条消息
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div v-else class="h-full flex flex-col items-center justify-center text-slate-400">
            <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p class="text-sm">暂无对话记录</p>
          </div>
        </div>
      </div>
      
      <!-- Close Button -->
      <button 
        class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
        @click="$emit('update:visible', false)"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18" />
          <path d="M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'select', conversation: any): void
}>()

// Mock Agents
const agents = [
  { id: 'agent-1', name: 'LuminaStudio AI', role: '通用助手', color: 'bg-gradient-to-tr from-emerald-500 to-teal-600' },
  { id: 'agent-2', name: 'Code Expert', role: '编程专家', color: 'bg-gradient-to-tr from-blue-500 to-indigo-600' },
  { id: 'agent-3', name: 'Writer Pro', role: '文案大师', color: 'bg-gradient-to-tr from-orange-500 to-amber-600' },
  { id: 'agent-4', name: 'Research Assistant', role: '科研助手', color: 'bg-gradient-to-tr from-purple-500 to-pink-600' }
]

const selectedAgentId = ref('agent-1')

// Mock Conversations
const allConversations = {
  'agent-1': [
    { 
      id: 'c1', 
      title: '关于核酸分子生物学的讨论', 
      preview: '核酸分子生物学是研究核酸结构与功能的学科，重点关注DNA和RNA在遗传信息传递中的作用...', 
      time: '10分钟前', 
      model: 'GPT-4o',
      messagesCount: 12
    },
    { 
      id: 'c2', 
      title: '解释量子计算的基本原理', 
      preview: '量子计算利用量子力学现象（如叠加和纠缠）来进行计算...', 
      time: '2小时前', 
      model: 'Claude 3.5 Sonnet',
      messagesCount: 8
    }
  ],
  'agent-2': [
    { 
      id: 'c3', 
      title: 'Vue 3 组件通信最佳实践', 
      preview: '在 Vue 3 中，组件通信可以通过 props/emit, provide/inject, 以及 Pinia 状态管理来实现...', 
      time: '昨天', 
      model: 'DeepSeek Coder',
      messagesCount: 24
    }
  ]
}

const currentAgentConversations = computed(() => {
  return allConversations[selectedAgentId.value] || []
})
</script>

<style>
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUpBounce {
  0% { 
    opacity: 0; 
    transform: translateY(100px) scale(0.95); 
  }
  50% { 
    opacity: 1; 
    transform: translateY(-10px) scale(1.02); 
  }
  75% { 
    transform: translateY(5px) scale(0.99); 
  }
  100% { 
    transform: translateY(0) scale(1); 
  }
}
</style>
