import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { LeftSidebarShellDatasource } from './left-sidebar-shell.datasource'
import type {
  LeftSidebarTab,
  LeftSidebarTopic,
  LeftSidebarSnapshot
} from './left-sidebar-shell.types'

const datasource = new LeftSidebarShellDatasource()

/**
 * 左侧栏 Store（SSOT）
 * 说明：
 * - 左侧栏开关、tab、助手列表、话题列表都统一从这里读取
 * - 组件只做展示和事件分发，不再在组件内部维护业务 ref
 */
export const useNormalChatLeftSidebarShellStore = defineStore(
  'normal-chat-left-sidebar-shell',
  () => {
    const snapshot = ref<LeftSidebarSnapshot>({
      activeTab: 'assistants',
      activeAssistantId: '',
      activeTopicId: '',
      assistants: [],
      drawSectionLabel: '绘图',
      toolsSectionLabel: 'tools',
      tools: [],
      topics: []
    })

    const currentAssistant = computed(() => {
      return (
        snapshot.value.assistants.find(
          (assistant) => assistant.id === snapshot.value.activeAssistantId
        ) ??
        snapshot.value.assistants[0] ??
        null
      )
    })

    async function initialize() {
      snapshot.value = await datasource.loadSnapshot()
    }

    async function persist() {
      await datasource.saveSnapshot(snapshot.value)
    }

    async function setActiveTab(value: LeftSidebarTab) {
      snapshot.value.activeTab = value
      await persist()
    }

    async function setActiveAssistant(assistantId: string) {
      snapshot.value.activeAssistantId = assistantId
      await persist()
    }

    async function setActiveTopic(topicId: string) {
      snapshot.value.activeTopicId = topicId
      await persist()
    }

    async function addTopic() {
      const newTopic: LeftSidebarTopic = {
        id: `topic-${Date.now()}`,
        title: `新话题 ${snapshot.value.topics.length + 1}`
      }
      snapshot.value.topics.unshift(newTopic)
      snapshot.value.activeTab = 'topics'
      snapshot.value.activeTopicId = newTopic.id
      await persist()
    }

    async function removeTopic(topicId: string) {
      snapshot.value.topics = snapshot.value.topics.filter((topic) => topic.id !== topicId)
      if (snapshot.value.activeTopicId === topicId) {
        snapshot.value.activeTopicId = snapshot.value.topics[0]?.id ?? ''
      }
      await persist()
    }

    return {
      snapshot,
      currentAssistant,
      initialize,
      setActiveTab,
      setActiveAssistant,
      setActiveTopic,
      addTopic,
      removeTopic
    }
  }
)
