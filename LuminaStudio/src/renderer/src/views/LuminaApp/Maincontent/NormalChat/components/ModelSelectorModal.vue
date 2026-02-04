<template>
  <!-- nc_ModelSelector_Root_a8d3: 模型选择对话框根容器 -->
  <div v-if="visible" class="nc_ModelSelector_Root_a8d3 fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- Backdrop -->
    <div 
      class="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" 
      @click="$emit('update:visible', false)"
    ></div>

    <!-- nc_ModelSelector_Content_a8d3: 对话框内容容器 -->
    <div 
      class="nc_ModelSelector_Content_a8d3 relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[80vh] overflow-hidden" 
      style="
        animation: bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
      "
    >
      <!-- nc_ModelSelector_Header_a8d3: 对话框头部 -->
      <div class="nc_ModelSelector_Header_a8d3 px-5 py-4 border-b border-slate-100">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-semibold text-slate-800">切换模型</h3>
          <button 
            class="text-slate-400 hover:text-slate-600 transition-colors"
            @click="$emit('update:visible', false)"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <!-- Search -->
        <div class="relative">
          <svg class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="搜索模型名称..." 
            class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>
      </div>

      <!-- nc_ModelSelector_List_a8d3: 模型列表 -->
      <div class="nc_ModelSelector_List_a8d3 flex-1 overflow-y-auto p-2 space-y-1">
        <template v-for="provider in filteredProviders" :key="provider.id">
          <div v-if="provider.models.length > 0" class="mb-2 last:mb-0">
            <div class="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span>{{ provider.name }}</span>
              <span class="h-px flex-1 bg-slate-100"></span>
            </div>
            
            <button
              v-for="model in provider.models"
              :key="model.id"
              @click="handleSelect(provider, model)"
              class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
              :class="{ 'bg-emerald-50 hover:bg-emerald-50/80': currentModelId === model.id }"
            >
              <div class="flex items-center gap-3">
                <div 
                  class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border shadow-sm transition-colors"
                  :class="currentModelId === model.id ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-600 border-slate-200 group-hover:border-slate-300'"
                >
                  {{ model.name[0].toUpperCase() }}
                </div>
                <div class="text-left">
                  <div 
                    class="text-sm font-medium"
                    :class="currentModelId === model.id ? 'text-emerald-900' : 'text-slate-700'"
                  >
                    {{ model.name }}
                  </div>
                  <div class="text-[10px] text-slate-400">{{ model.desc }}</div>
                </div>
              </div>
              
              <div v-if="currentModelId === model.id" class="text-emerald-600">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
            </button>
          </div>
        </template>
        
        <div v-if="filteredProviders.every(p => p.models.length === 0)" class="text-center py-8 text-slate-400 text-sm">
          未找到相关模型
        </div>
      </div>
      
      <!-- nc_ModelSelector_Footer_a8d3: 对话框底部 -->
      <div class="nc_ModelSelector_Footer_a8d3 p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 px-5">
        <span>支持 Shift + Tab 切换</span>
        <button class="hover:text-emerald-600 transition-colors">管理模型源</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Model {
  id: string
  name: string
  desc: string
}

interface Provider {
  id: string
  name: string
  models: Model[]
}

const props = defineProps<{
  visible: boolean
  currentProviderId: string
  currentModelId: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'select', provider: Provider, model: Model): void
}>()

const searchQuery = ref('')

// Mock Data - 后续可替换为 IPC 数据
const providers: Provider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', desc: '最新旗舰模型，能力最强' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', desc: '快速且强大的推理能力' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', desc: '经济实惠，响应快速' }
    ]
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: [
      { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', desc: '编码与推理能力卓越' },
      { id: 'claude-3-opus', name: 'Claude 3 Opus', desc: '最强推理模型' }
    ]
  },
  {
    id: 'google',
    name: 'Google',
    models: [
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', desc: '超长上下文窗口支持' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', desc: '极致速度' }
    ]
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3', desc: '综合能力优秀的开源模型' },
      { id: 'deepseek-coder', name: 'DeepSeek Coder', desc: '代码生成专精' }
    ]
  }
]

const filteredProviders = computed(() => {
  if (!searchQuery.value) return providers
  
  const query = searchQuery.value.toLowerCase()
  return providers.map(p => ({
    ...p,
    models: p.models.filter(m => 
      m.name.toLowerCase().includes(query) || 
      p.name.toLowerCase().includes(query)
    )
  })).filter(p => p.models.length > 0)
})

const handleSelect = (provider: Provider, model: Model) => {
  emit('select', provider, model)
  emit('update:visible', false)
}
</script>

<style scoped>
@keyframes bounceIn {
  0% { opacity: 0; transform: scale(0.3); }
  50% { opacity: 1; transform: scale(1.05); }
  70% { transform: scale(0.95); }
  100% { transform: scale(1); }
}
</style>
