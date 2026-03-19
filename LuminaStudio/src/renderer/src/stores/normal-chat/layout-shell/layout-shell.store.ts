import { defineStore } from 'pinia'
import { ref } from 'vue'
import { LayoutShellDatasource } from './layout-shell.datasource'
import type { NormalChatLeftTab, NormalChatRightPage } from './layout-shell.types'

const datasource = new LayoutShellDatasource()

/**
 * NormalChat 布局 Store（SSOT）
 * 说明：
 * - 所有与布局壳体相关的状态都统一从这里读写
 * - 组件不再持有本地 ref 状态，避免不同区域状态分叉
 */
export const useNormalChatLayoutShellStore = defineStore('normal-chat-layout-shell', () => {
  const leftCollapsed = ref(true)
  const rightCollapsed = ref(true)
  const leftTab = ref<NormalChatLeftTab>('sources')
  const rightPage = ref<NormalChatRightPage>('studio')

  async function initialize() {
    const snapshot = await datasource.loadSnapshot()
    leftCollapsed.value = snapshot.leftCollapsed
    rightCollapsed.value = snapshot.rightCollapsed
    leftTab.value = snapshot.leftTab
    rightPage.value = snapshot.rightPage
  }

  async function persist() {
    await datasource.saveSnapshot({
      leftCollapsed: leftCollapsed.value,
      rightCollapsed: rightCollapsed.value,
      leftTab: leftTab.value,
      rightPage: rightPage.value
    })
  }

  async function setLeftCollapsed(value: boolean) {
    leftCollapsed.value = value
    await persist()
  }

  async function setRightCollapsed(value: boolean) {
    rightCollapsed.value = value
    await persist()
  }

  async function setLeftTab(value: NormalChatLeftTab) {
    leftTab.value = value
    await persist()
  }

  async function setRightPage(value: NormalChatRightPage) {
    rightPage.value = value
    await persist()
  }

  async function toggleLeftCollapsed() {
    await setLeftCollapsed(!leftCollapsed.value)
  }

  async function toggleRightCollapsed() {
    await setRightCollapsed(!rightCollapsed.value)
  }

  return {
    leftCollapsed,
    rightCollapsed,
    leftTab,
    rightPage,
    initialize,
    setLeftCollapsed,
    setRightCollapsed,
    setLeftTab,
    setRightPage,
    toggleLeftCollapsed,
    toggleRightCollapsed
  }
})
