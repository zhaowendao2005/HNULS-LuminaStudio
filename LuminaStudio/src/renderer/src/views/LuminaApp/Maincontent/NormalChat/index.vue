<template>
  <div class="nc_NormalChat_Root_a9k2 nc-normalchat-theme-a9k2 flex h-full w-full gap-4">
    <!-- nc = NormalChat -->
    <!-- nc_NormalChat_Root_a9k2: 页面根容器 -->
    <!-- nc_NormalChat_LeftPanel_a9k2: 左侧来源面板 -->
    <!-- nc_NormalChat_Center_a9k2: 中间聊天内容 -->
    <!-- nc_NormalChat_RightPanel_a9k2: 右侧工具面板 -->
    <LeftPanel
      :collapsed="leftCollapsed"
      :current-tab="leftTab"
      :tab-options="leftTabOptions"
      @update:collapsed="layoutStore.setLeftCollapsed"
      @update:current-tab="onLeftTabUpdate"
    />
    <ChatMain />
    <RightPanel
      :collapsed="rightCollapsed"
      :current-page="rightPage"
      :tools="tools"
      :notes="notes"
      @update:collapsed="layoutStore.setRightCollapsed"
      @update:current-page="onRightPageUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import LeftPanel from './LeftPanel/index.vue'
import RightPanel from './RightPanel/index.vue'
import ChatMain from './NormalChat-Maincontent/ChatMain.vue'
import { type WhiteSelectOption } from './components/WhiteSelect.vue'
import { useNormalChatLayoutShellStore } from '@renderer/stores/normal-chat/layout-shell/layout-shell.store'
import type {
  NormalChatLeftTab,
  NormalChatRightPage
} from '@renderer/stores/normal-chat/layout-shell/layout-shell.types'

const layoutStore = useNormalChatLayoutShellStore()
const { leftCollapsed, rightCollapsed, leftTab, rightPage } = storeToRefs(layoutStore)

onMounted(() => {
  // 布局状态统一走全局 store，避免页面局部状态分裂
  void layoutStore.initialize()
})

const leftTabOptions: WhiteSelectOption[] = [
  { label: '会话管理', value: 'conversation' },
  { label: '来源', value: 'sources' },
  { label: '设置', value: 'settings' },
  { label: '历史', value: 'history' }
]

const onLeftTabUpdate = (value: string) => {
  void layoutStore.setLeftTab(value as NormalChatLeftTab)
}

const onRightPageUpdate = (value: string) => {
  void layoutStore.setRightPage(value as NormalChatRightPage)
}

// 右侧面板继续展示静态内容，保持视觉壳子不变
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
</script>

<style scoped lang="scss">
@use './normal-chat-theme.scss' as *;
</style>
