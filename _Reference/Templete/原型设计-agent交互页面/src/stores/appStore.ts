import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Node, Edge } from '@vue-flow/core'
import dagre from 'dagre'

export const useAppStore = defineStore('app', () => {
  // 面板状态
  const activePanel = ref<'none' | 'config' | 'monitor'>('none')
  
  // Drawer 状态
  const isDrawerOpen = ref(false)
  const selectedNode = ref<Node | null>(null)

  // 切换面板
  const setPanel = (panel: 'none' | 'config' | 'monitor') => {
    activePanel.value = panel
    // 切换面板时关闭抽屉
    closeDrawer()
  }
  
  const openDrawer = (node: Node) => {
    selectedNode.value = node
    isDrawerOpen.value = true
  }

  const closeDrawer = () => {
    isDrawerOpen.value = false
    selectedNode.value = null
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
    { id: 'c1', type: 'custom', position: { x: 250, y: 50 }, data: { label: 'Start', type: 'start', config: { description: 'Entry point' } } },
    { id: 'c2', type: 'custom', position: { x: 250, y: 150 }, data: { label: 'Deep Research Planner', type: 'process', config: { model: 'gpt-4-turbo', temperature: 0.7 } } },
    { id: 'c3', type: 'custom', position: { x: 100, y: 300 }, data: { label: 'RAG Search (PubMed)', type: 'tool', config: { source: 'pubmed', max_results: 10 } } },
    { id: 'c4', type: 'custom', position: { x: 400, y: 300 }, data: { label: 'MCP Integration', type: 'tool', config: { server: 'filesystem-mcp', mode: 'read-only' } } },
    { id: 'c5', type: 'custom', position: { x: 250, y: 450 }, data: { label: 'Decision Node', type: 'decision', config: { threshold: 0.8 } } },
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

  // 生成复杂树状数据 (Bottom-Top)
  const generateComplexTree = () => {
    const g = new dagre.graphlib.Graph()
    g.setGraph({ rankdir: 'BT', nodesep: 100, ranksep: 100 })
    g.setDefaultEdgeLabel(() => ({}))

    const nodes: Node[] = []
    const edges: Edge[] = []
    
    // Helper to add node
    let nodeIdCounter = 0
    const addNode = (label: string, type: string, status: string = 'completed', parentId?: string) => {
        nodeIdCounter++
        const id = `m-${nodeIdCounter}`
        const node: Node = {
            id,
            type: 'custom',
            position: { x: 0, y: 0 }, // layout will fix this
            data: { label, type, status, details: `Log content for ${label}...` }
        }
        nodes.push(node)
        g.setNode(id, { width: 180, height: 60 }) // approximate size

        if (parentId) {
            const edgeId = `e-${parentId}-${id}`
            const edge: Edge = { id: edgeId, source: parentId, target: id, animated: true }
            edges.push(edge)
            g.setEdge(parentId, id) // 注意：Vue Flow是Source->Target。Dagre BT布局是从下往上，Source在下Target在上。
            // 这里的Source是parentId(较早的节点), Target是id(较晚的节点)。
            // 如果我们要树向上生长，Root应该在最下面。
            // Dagre 'BT' means rank 0 is at bottom.
            // 通常Flow是从Start流向End。
            // 如果我们希望 Start 在底部，End 在顶部。
            // 那么 Edge source -> target 应该是 visually bottom -> top.
            // dagre 'BT' does exactly this: Source nodes are lower ranks (bottom), Target nodes are higher ranks (top).
        }
        return id
    }

    // Root (Start at bottom)
    const root = addNode('User Request', 'start', 'completed')

    // Level 1: Initial Planning
    const plan = addNode('Deep Analysis', 'process', 'completed', root)

    // Level 2: Parallel Branches
    // Branch A: Literature Search
    const searchBranch = addNode('Lit. Search Plan', 'process', 'completed', plan)
    
    // Generate many search nodes
    for (let i = 1; i <= 5; i++) {
        const query = addNode(`Query Gen #${i}`, 'tool', 'completed', searchBranch)
        const exec = addNode(`PubMed Search #${i}`, 'tool', 'completed', query)
        const filter = addNode(`Filter Results #${i}`, 'process', 'completed', exec)
        // Sub-branches
        if (i % 2 === 0) {
            const detail = addNode(`Fetch Abstract #${i}`, 'tool', 'completed', filter)
        }
    }

    // Branch B: Data Retrieval (MCP)
    const dataBranch = addNode('Data Retrieval', 'process', 'completed', plan)
    const connect = addNode('Connect Lab DB', 'mcp', 'completed', dataBranch)
    const queryDb = addNode('Query Experiment Data', 'mcp', 'completed', connect)
    
    const validate = addNode('Data Validation', 'decision', 'completed', queryDb)
    // Error path simulation
    const retry = addNode('Retry Logic', 'process', 'waiting', validate)

    // Branch C: Synthesis (The "Head" growing up)
    const synthesis = addNode('Synthesis', 'process', 'running', plan)
    
    // Connect branches to synthesis (Logical merge, though tree usually diverges. Let's make it a DAG)
    // Add edges from leaves of A and B to Synthesis
    // Manually adding edges without creating new nodes
    // Note: Dagre handles DAGs.
    
    // Apply Layout
    dagre.layout(g)

    // Update positions
    nodes.forEach(node => {
        const nodeWithPos = g.node(node.id)
        // Dagre center-based position to Top-Left
        node.position = {
            x: nodeWithPos.x - nodeWithPos.width / 2,
            y: nodeWithPos.y - nodeWithPos.height / 2
        }
    })
    
    return { nodes, edges }
  }

  // 模拟启动监控流程
  const startMonitoring = () => {
    // 生成大规模数据
    const { nodes, edges } = generateComplexTree()
    monitorNodes.value = nodes
    monitorEdges.value = edges
  }

  return {
    activePanel,
    setPanel,
    isDrawerOpen,
    selectedNode,
    openDrawer,
    closeDrawer,
    messages,
    addMessage,
    configNodes,
    configEdges,
    monitorNodes,
    monitorEdges,
    startMonitoring
  }
})
