import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Node, Edge } from '@vue-flow/core'

export const useAppStore = defineStore('app', () => {
  // 面板状态
  const activePanel = ref<'none' | 'config' | 'monitor'>('none')
  
  // 切换面板
  const setPanel = (panel: 'none' | 'config' | 'monitor') => {
    activePanel.value = panel
  }

  // 聊天消息
  const messages = ref<{ role: 'user' | 'agent', content: string }[]>([
    { role: 'agent', content: '你好！我是你的智能代理。请点击上方按钮配置我的工作流，或直接告诉我你的需求。' }
  ])

  const addMessage = (role: 'user' | 'agent', content: string) => {
    messages.value.push({ role, content })
  }

  // 配置图数据
  const configNodes = ref<Node[]>([
    { id: 'c1', type: 'custom', position: { x: 250, y: 50 }, data: { label: 'Start', type: 'start' } },
    { id: 'c2', type: 'custom', position: { x: 250, y: 150 }, data: { label: 'Deep Research Planner', type: 'process' } },
    { id: 'c3', type: 'custom', position: { x: 100, y: 300 }, data: { label: 'RAG Search (PubMed)', type: 'tool' } },
    { id: 'c4', type: 'custom', position: { x: 400, y: 300 }, data: { label: 'MCP Integration', type: 'tool' } },
    { id: 'c5', type: 'custom', position: { x: 250, y: 450 }, data: { label: 'Decision Node', type: 'decision' } },
  ])
  
  const configEdges = ref<Edge[]>([
    { id: 'e1-2', source: 'c1', target: 'c2', animated: true },
    { id: 'e2-3', source: 'c2', target: 'c3', animated: true },
    { id: 'e2-4', source: 'c2', target: 'c4', animated: true },
    { id: 'e3-5', source: 'c3', target: 'c5' },
    { id: 'e4-5', source: 'c4', target: 'c5' },
  ])

  // 监控图数据（模拟运行时）
  const monitorNodes = ref<Node[]>([])
  const monitorEdges = ref<Edge[]>([])

  // 模拟启动监控流程
  const startMonitoring = () => {
    monitorNodes.value = [
      { id: 'm1', type: 'custom', position: { x: 50, y: 200 }, data: { label: 'Start Analysis', status: 'completed' } },
    ]
    monitorEdges.value = []
    
    // 模拟逐步生成
    setTimeout(() => {
        monitorNodes.value.push({ id: 'm2', type: 'custom', position: { x: 250, y: 200 }, data: { label: 'User Feedback', status: 'waiting' } })
        monitorEdges.value.push({ id: 'em1-2', source: 'm1', target: 'm2', animated: true })
    }, 1000)
  }

  return {
    activePanel,
    setPanel,
    messages,
    addMessage,
    configNodes,
    configEdges,
    monitorNodes,
    monitorEdges,
    startMonitoring
  }
})
