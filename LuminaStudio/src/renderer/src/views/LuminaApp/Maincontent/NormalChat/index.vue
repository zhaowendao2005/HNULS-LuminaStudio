<template>
  <div class="nc_NormalChat_Root_a8d3 flex h-full w-full gap-4">
    <!-- nc = NormalChat -->
    <!-- nc_NormalChat_Root_a8d3: 页面根容器 -->
    <!-- nc_NormalChat_LeftPanel_a8d3: 左侧来源面板 -->
    <!-- nc_NormalChat_Center_a8d3: 中间对话区 -->
    <!-- nc_NormalChat_RightPanel_a8d3: 右侧工具面板 -->

    <!-- Left Panel -->
    <LeftPanel
      v-model:collapsed="leftCollapsed"
      v-model:currentTab="currentTab"
      :tab-options="leftTabOptions"
      :sources-disabled="inputBarStore.mode === 'normal'"
    />

    <!-- Center Chat -->
    <ChatMain
      :messages="messages"
      :is-generating="isGenerating"
      v-model:user-input="userInput"
      :display-provider-id="displayProviderId"
      :display-model-id="displayModelId"
      @send="handleSend"
      @abort="handleAbort"
      @show-conversation-list="showConversationList = true"
      @show-model-selector="showModelSelector = true"
    />

    <!-- Right Panel -->
    <RightPanel v-model:collapsed="rightCollapsed" :tools="tools" :notes="notes" />

    <!-- Modals -->
    <ModelSelectorModal
      v-model:visible="showModelSelector"
      :current-provider-id="currentProviderId"
      :current-model-id="currentModelId"
      @select="handleModelSelect"
    />

    <ConversationListModal v-model:visible="showConversationList" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import LeftPanel from './LeftPanel/index.vue'
import RightPanel from './RightPanel/index.vue'
import ChatMain from './NormalChat-Maincontent/ChatMain.vue'
import ModelSelectorModal from './NormalChat-Maincontent/ModelSelectorModal.vue'
import ConversationListModal from './NormalChat-Maincontent/ConversationListModal.vue'
import { type WhiteSelectOption } from './components/WhiteSelect.vue'
import { useAiChatStore } from '@renderer/stores/ai-chat/store'
import { useModelConfigStore } from '@renderer/stores/model-config/store'
import { useInputBarStore } from '@renderer/stores/ai-chat/input-bar.store'

const chatStore = useAiChatStore()
const modelConfigStore = useModelConfigStore()
const inputBarStore = useInputBarStore()

// ===== 面板控制 =====
const leftCollapsed = ref(true) // 默认折叠左侧栏
const rightCollapsed = ref(true) // 默认折叠右侧栏

// ===== Tab 控制 =====
const currentTab = ref<string>('sources')
const leftTabOptions: WhiteSelectOption[] = [
  { label: '来源', value: 'sources' },
  { label: '设置', value: 'settings' },
  { label: '历史', value: 'history' }
]

// ===== 模态框控制 =====
const showModelSelector = ref(false)
const showConversationList = ref(false)

// ===== 静态数据 =====
const tools = [
  {
    id: 'audio',
    title: '音频概览',
    icon: 'audio',
    color: 'bg-emerald-50 border-emerald-100 text-emerald-700'
  },
  {
    id: 'video',
    title: '视频概览',
    icon: 'video',
    color: 'bg-emerald-50 border-emerald-100 text-emerald-700'
  },
  {
    id: 'mind',
    title: '思维导图',
    icon: 'mind',
    color: 'bg-purple-50 border-purple-100 text-purple-700'
  },
  {
    id: 'report',
    title: '报告',
    icon: 'report',
    color: 'bg-amber-50 border-amber-100 text-amber-700'
  },
  { id: 'cards', title: '闪卡', icon: 'cards', color: 'bg-rose-50 border-rose-100 text-rose-700' },
  { id: 'quiz', title: '测验', icon: 'quiz', color: 'bg-sky-50 border-sky-100 text-sky-700' },
  {
    id: 'info',
    title: '信息图',
    icon: 'info',
    color: 'bg-indigo-50 border-indigo-100 text-indigo-700'
  },
  {
    id: 'slides',
    title: '演示文稿',
    icon: 'slides',
    color: 'bg-amber-50 border-amber-100 text-amber-700'
  },
  {
    id: 'table',
    title: '数据表格',
    icon: 'table',
    color: 'bg-blue-50 border-blue-100 text-blue-700'
  }
]

const notes = [
  { id: 1, title: '现代分子生物学核心考点指南', time: '46 天前' },
  { id: 2, title: '分子生物学重点', time: '47 天前' },
  { id: 3, title: '细胞生物学复习提纲', time: '51 天前' },
  { id: 4, title: '细胞工程原理与应用概论', time: '53 天前' }
]

const userInput = ref('')

const messages = computed(() => chatStore.currentMessages)
const isGenerating = computed(() => chatStore.isGenerating)

const currentProviderId = computed(() => chatStore.currentProviderId)
const currentModelId = computed(() => chatStore.currentModelId)
const displayProviderId = computed(() => currentProviderId.value || 'provider')
const displayModelId = computed(() => currentModelId.value || 'model')

const handleModelSelect = (provider: any, model: any) => {
  chatStore.setCurrentModel(provider.id, model.id)
}

// ===== 发送消息 =====
const handleSend = async () => {
  const input = userInput.value.trim()
  if (!input || isGenerating.value) return

  try {
    await chatStore.sendMessage(input)
    userInput.value = ''
  } catch (error) {
    console.error('AI 生成失败:', error)
  }
}

// ===== 中断生成 =====
const handleAbort = async () => {
  await chatStore.abortGeneration()
}

// 初始化模型配置
modelConfigStore.fetchProviders().catch(() => {})
chatStore.loadAgents().catch(() => {})

watch(
  () => modelConfigStore.providers,
  (providers) => {
    if (chatStore.currentProviderId || providers.length === 0) return
    const firstProvider = providers[0]
    const firstModel = firstProvider.models[0]
    if (firstModel) {
      chatStore.setCurrentModel(firstProvider.id, firstModel.id)
    }
  },
  { deep: true, immediate: true }
)
</script>
