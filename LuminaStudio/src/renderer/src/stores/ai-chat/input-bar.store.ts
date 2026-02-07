/**
 * Input Bar Store
 *
 * 管理输入栏相关的全局状态
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ChatMode = 'normal' | 'agent'

export const useInputBarStore = defineStore('input-bar', () => {
  // ===== State =====
  const mode = ref<ChatMode>('normal') // 默认为 Normal 模式

  // ===== Actions =====
  function setMode(newMode: ChatMode): void {
    mode.value = newMode
  }

  return {
    // state
    mode,

    // actions
    setMode
  }
})
