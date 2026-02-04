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
            v-for="(agent, idx) in agents"
            :key="agent.id"
            @click="handleSelectAgent(agent.id)"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group"
            :class="selectedAgentId === agent.id ? 'bg-white shadow-sm ring-1 ring-slate-100' : 'hover:bg-slate-100'"
          >
            <div 
              class="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm"
              :class="agentColorClasses[idx % agentColorClasses.length]"
            >
              {{ agent.name[0] }}
            </div>
            <div class="text-left flex-1 min-w-0">
              <div class="text-sm font-medium text-slate-700 truncate">{{ agent.name }}</div>
              <div class="text-[10px] text-slate-400 truncate">
                {{ agent.description || '智能助手' }}
              </div>
            </div>
          </button>
        </div>
        
        <div class="p-3 border-t border-slate-100">
          <button
            class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:text-emerald-600 hover:border-emerald-200 transition-colors"
            @click="openCreateAgentModal"
          >
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
          <div class="flex items-center gap-3">
            <button
              class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors"
              @click="openCreateConversationModal"
            >
              新建对话
            </button>
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
        </div>

        <!-- List -->
        <div class="flex-1 overflow-y-auto p-6">
          <div v-if="currentAgentConversations.length > 0" class="space-y-3">
            <div 
              v-for="conv in currentAgentConversations" 
              :key="conv.id"
              class="group flex items-start gap-4 p-4 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-500/5 transition-all cursor-pointer bg-white"
              @click="handleSelectConversation(conv.id)"
            >
              <div class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-50 transition-colors">
                 <svg class="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                   <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                 </svg>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-1">
                  <h4 class="text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors truncate">
                    {{ conv.title || `对话 ${conv.id.slice(0, 8)}` }}
                  </h4>
                  <span class="text-[10px] text-slate-400">{{ formatTime(conv.updatedAt) }}</span>
                </div>
                <p class="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  共 {{ conv.messageCount }} 条消息
                </p>
                <div class="flex items-center gap-2 mt-3">
                  <span class="px-2 py-0.5 rounded-md bg-slate-50 text-[10px] text-slate-400 border border-slate-100">
                    {{ conv.modelId }}
                  </span>
                  <span class="px-2 py-0.5 rounded-md bg-slate-50 text-[10px] text-slate-400 border border-slate-100">
                    {{ conv.messageCount }} 条消息
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

    <!-- Create Agent Modal -->
    <div
      v-if="showCreateAgentModal"
      class="nc_ConversationList_SubModal_a8d3 absolute inset-0 z-20 flex items-center justify-center"
    >
      <div class="absolute inset-0 bg-black/30" @click="closeCreateAgentModal"></div>
      <div class="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 p-6">
        <div class="text-lg font-semibold text-slate-800">新建助手</div>
        <div class="mt-4 space-y-3">
          <input
            v-model="newAgentName"
            type="text"
            placeholder="助手名称（必填）"
            class="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
          />
          <textarea
            v-model="newAgentDescription"
            rows="3"
            placeholder="描述（可选）"
            class="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none"
          ></textarea>
        </div>
        <div class="mt-6 flex items-center justify-end gap-2">
          <button
            class="px-4 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-700 transition-colors"
            @click="closeCreateAgentModal"
          >
            取消
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            :disabled="!newAgentName.trim()"
            @click="handleCreateAgent"
          >
            创建
          </button>
        </div>
      </div>
    </div>

    <!-- Create Conversation Modal -->
    <div
      v-if="showCreateConversationModal"
      class="nc_ConversationList_SubModal_a8d3 absolute inset-0 z-20 flex items-center justify-center"
    >
      <div class="absolute inset-0 bg-black/30" @click="closeCreateConversationModal"></div>
      <div class="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 p-6">
        <div class="text-lg font-semibold text-slate-800">新建对话</div>
        <div class="mt-4 space-y-4">
          <input
            v-model="newConversationTitle"
            type="text"
            placeholder="对话标题（可选）"
            class="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
          />
          <div class="grid grid-cols-2 gap-3">
            <div>
              <div class="text-xs text-slate-500 mb-2">Provider</div>
              <select
                v-model="selectedProviderId"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
              >
                <option v-for="provider in providers" :key="provider.id" :value="provider.id">
                  {{ provider.name || provider.id }}
                </option>
              </select>
            </div>
            <div>
              <div class="text-xs text-slate-500 mb-2">Model</div>
              <select
                v-model="selectedModelId"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
              >
                <option v-for="model in providerModels" :key="model.id" :value="model.id">
                  {{ model.name || model.id }}
                </option>
              </select>
            </div>
          </div>
          <div v-if="providers.length === 0" class="text-xs text-amber-500">
            暂无可用 Provider，请先在模型配置中添加。
          </div>
        </div>
        <div class="mt-6 flex items-center justify-end gap-2">
          <button
            class="px-4 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-700 transition-colors"
            @click="closeCreateConversationModal"
          >
            取消
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            :disabled="!selectedProviderId || !selectedModelId"
            @click="handleCreateConversation"
          >
            创建
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAiChatStore } from '@renderer/stores/ai-chat/store'
import { useModelConfigStore } from '@renderer/stores/model-config/store'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const chatStore = useAiChatStore()
const modelConfigStore = useModelConfigStore()

const agentColorClasses = [
  'bg-gradient-to-tr from-emerald-500 to-teal-600',
  'bg-gradient-to-tr from-blue-500 to-indigo-600',
  'bg-gradient-to-tr from-orange-500 to-amber-600',
  'bg-gradient-to-tr from-purple-500 to-pink-600'
]

const agents = computed(() => chatStore.agents)
const selectedAgentId = computed(() => chatStore.currentAgentId)
const currentAgentConversations = computed(() => chatStore.currentConversations)
const providers = computed(() => modelConfigStore.providers)

const showCreateAgentModal = ref(false)
const showCreateConversationModal = ref(false)
const newAgentName = ref('')
const newAgentDescription = ref('')
const newConversationTitle = ref('')
const selectedProviderId = ref<string | null>(null)
const selectedModelId = ref<string | null>(null)

const providerModels = computed(() => {
  const provider = providers.value.find((p) => p.id === selectedProviderId.value)
  return provider?.models || []
})

const handleSelectAgent = async (agentId: string) => {
  await chatStore.selectAgent(agentId)
}

const handleSelectConversation = async (conversationId: string) => {
  await chatStore.switchConversation(conversationId)
  emit('update:visible', false)
}

const openCreateAgentModal = () => {
  newAgentName.value = ''
  newAgentDescription.value = ''
  showCreateAgentModal.value = true
}

const closeCreateAgentModal = () => {
  showCreateAgentModal.value = false
}

const handleCreateAgent = async () => {
  const name = newAgentName.value.trim()
  if (!name) return
  await chatStore.createAgent(name, newAgentDescription.value.trim() || null)
  showCreateAgentModal.value = false
}

const openCreateConversationModal = async () => {
  showCreateConversationModal.value = true
  await modelConfigStore.fetchProviders().catch(() => {})
  if (providers.value.length > 0) {
    const preferredProvider =
      chatStore.currentProviderId &&
      providers.value.some((p) => p.id === chatStore.currentProviderId)
        ? chatStore.currentProviderId
        : providers.value[0].id
    selectedProviderId.value = preferredProvider

    const models = providers.value.find((p) => p.id === preferredProvider)?.models || []
    if (models.length > 0) {
      const preferredModel =
        chatStore.currentModelId && models.some((m) => m.id === chatStore.currentModelId)
          ? chatStore.currentModelId
          : models[0].id
      selectedModelId.value = preferredModel
    }
  }
}

const closeCreateConversationModal = () => {
  showCreateConversationModal.value = false
}

const handleCreateConversation = async () => {
  const agentId = chatStore.currentAgentId
  if (!agentId || !selectedProviderId.value || !selectedModelId.value) return
  await chatStore.createConversation({
    agentId,
    title: newConversationTitle.value.trim() || null,
    providerId: selectedProviderId.value,
    modelId: selectedModelId.value,
    enableThinking: chatStore.enableThinking
  })
  showCreateConversationModal.value = false
  emit('update:visible', false)
}

const formatTime = (value: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) return
    await chatStore.loadAgents()
    await modelConfigStore.fetchProviders().catch(() => {})
    if (chatStore.currentAgentId) {
      await chatStore.loadConversations(chatStore.currentAgentId)
    }
  }
)

watch(
  providers,
  (list) => {
    if (!selectedProviderId.value && list.length > 0) {
      selectedProviderId.value = chatStore.currentProviderId || list[0].id
    }
  },
  { immediate: true }
)

watch(
  providerModels,
  (models) => {
    if (models.length === 0) {
      selectedModelId.value = null
      return
    }
    if (!models.some((m) => m.id === selectedModelId.value)) {
      selectedModelId.value = chatStore.currentModelId || models[0].id
    }
  },
  { immediate: true }
)

watch(
  () => showCreateConversationModal.value,
  (visible) => {
    if (!visible) return
    newConversationTitle.value = ''
  }
)
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
