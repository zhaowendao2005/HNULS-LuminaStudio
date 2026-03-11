<template>
  <div
    class="of-generate-view of-generate-shell h-full w-full overflow-hidden bg-gray-50 text-gray-800"
  >
    <div class="flex h-full w-full flex-col overflow-hidden font-sans">
      <GenerateHeader @toggle-sidebar="isLeftSidebarCollapsed = !isLeftSidebarCollapsed" />

      <div class="relative flex flex-1 overflow-hidden">
        <GenerateSidebar
          :collapsed="isLeftSidebarCollapsed"
          :active-menu="activeMenu"
          :basic-menus="basicMenus"
          :workflow-menus="workflowMenus"
          :config-menus="configMenus"
          @change-menu="activeMenu = $event"
        />

        <main class="relative flex flex-1 overflow-hidden bg-white">
          <div
            :class="[
              'flex-1 overflow-y-auto transition-all duration-300',
              isRightPanelFullscreen ? 'hidden' : 'block'
            ]"
          >
            <GenerateDashboardPanel
              v-if="activeMenu === 'dashboard'"
              :sessions-count="sessions.length"
              :planned-sessions-count="plannedSessionsCount"
              :current-session-stage-label="currentSessionStageLabel"
              :dashboard-stage-cards="dashboardStageCards"
            />

            <GenerateSessionsPanel
              v-else-if="activeMenu === 'sessions'"
              :sessions="sessions"
              :selected-session-id="selectedSessionId"
              :stage-order="stageOrder"
              :get-stage-label="getStageLabel"
              :get-session-stage-dot-class="getSessionStageDotClass"
              @open-create-session="openCreateSessionModal"
              @select-session="handleSelectSession($event, 'sessions')"
            />

            <GenerateAnalysisPanel
              v-else-if="activeMenu === 'analysis'"
              :session="currentSession"
              :current-session-stage-label="currentSessionStageLabel"
              :analysis-input="analysisInput"
              :is-analysis-streaming="isAnalysisStreaming"
              @open-sessions="activeMenu = 'sessions'"
              @open-copilot="openCopilotPanel('analysis')"
              @enter-design="enterDesignView"
              @update:analysis-input="analysisInput = $event"
              @send-analysis="handleSendAnalysis"
            />

            <GenerateDesignPanel
              v-else-if="activeMenu === 'design'"
              :session="currentSession"
              :design-content="currentSession.design.content"
              @update:design-content="handleUpdateDesignContent"
              @open-copilot="openCopilotPanel('design')"
            />

            <div v-else class="p-6 text-[13px] text-gray-500">
              {{ activeMenu }} 模块开发中，当前选中会话：{{ currentSession.title }}。
            </div>
          </div>

          <GeneratePlanDesignPanel
            :visible="activeRightPanel !== null"
            :is-fullscreen="isRightPanelFullscreen"
            :mode="activeRightPanel || 'analysis'"
            :session="currentSession"
            :copilot-input="copilotInput"
            @toggle-fullscreen="isRightPanelFullscreen = !isRightPanelFullscreen"
            @close="closeRightPanel"
            @update:copilot-input="copilotInput = $event"
            @send-copilot-message="handleSendCopilotMessage"
          />
        </main>
      </div>
    </div>

    <GenerateCreateSessionDialog
      :visible="showCreateSessionModal"
      :model-value="newSessionName"
      @update:model-value="newSessionName = $event"
      @close="closeCreateSessionModal"
      @confirm="handleCreateSession"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Activity,
  CheckCircle,
  GitBranch,
  LayoutTemplate,
  MessageSquare,
  Settings
} from 'lucide-vue-next'
import GenerateAnalysisPanel from './GenerateAnalysisPanel.vue'
import GenerateCreateSessionDialog from './GenerateCreateSessionDialog.vue'
import GenerateDashboardPanel from './GenerateDashboardPanel.vue'
import GenerateDesignPanel from './GenerateDesignPanel.vue'
import GenerateHeader from './GenerateHeader.vue'
import GeneratePlanDesignPanel from './GeneratePlanDesignPanel.vue'
import GenerateSessionsPanel from './GenerateSessionsPanel.vue'
import GenerateSidebar from './GenerateSidebar.vue'
import type {
  CopilotMode,
  DashboardStageCard,
  DiffLine,
  MenuItem,
  MenuValue,
  RightPanel,
  SessionDesignState,
  SessionDocumentState,
  SessionItem,
  SessionPlanState,
  StageKey,
  StageMeta
} from './generate-view.types'

const stageOrder: StageKey[] = ['analysis', 'design', 'verify', 'workflow']

const stageMeta: Record<StageKey, StageMeta> = {
  analysis: {
    label: '未完成需求分析',
    color: 'bg-cyan-500',
    activeDot: 'h-3.5 w-3.5 bg-cyan-500 shadow-[0_0_0_2px_rgba(6,182,212,0.12)]',
    idleDot: 'h-2 w-2 bg-cyan-200'
  },
  design: {
    label: '未完成设计',
    color: 'bg-emerald-500',
    activeDot: 'h-3.5 w-3.5 bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.12)]',
    idleDot: 'h-2 w-2 bg-emerald-200'
  },
  verify: {
    label: '未完成校验',
    color: 'bg-violet-500',
    activeDot: 'h-3.5 w-3.5 bg-violet-500 shadow-[0_0_0_2px_rgba(139,92,246,0.12)]',
    idleDot: 'h-2 w-2 bg-violet-200'
  },
  workflow: {
    label: '未生成工作流',
    color: 'bg-amber-500',
    activeDot: 'h-3.5 w-3.5 bg-amber-500 shadow-[0_0_0_2px_rgba(245,158,11,0.12)]',
    idleDot: 'h-2 w-2 bg-amber-200'
  }
}

const isLeftSidebarCollapsed = ref(false)
const activeMenu = ref<MenuValue>('analysis')
const activeRightPanel = ref<RightPanel>(null)
const isRightPanelFullscreen = ref(false)
const analysisInput = ref('')
const copilotInput = ref('')
const isAnalysisStreaming = ref(false)
const showCreateSessionModal = ref(false)
const newSessionName = ref('')

const basicMenus: MenuItem[] = [
  { value: 'dashboard', label: 'Dashboard', icon: Activity },
  { value: 'sessions', label: '会话管理', icon: MessageSquare }
]

const workflowMenus: MenuItem[] = [
  { value: 'analysis', label: '需求分析与计划', icon: GitBranch },
  { value: 'design', label: '规划设计', icon: LayoutTemplate },
  { value: 'verify', label: '校验', icon: CheckCircle }
]

const configMenus: MenuItem[] = [{ value: 'settings', label: '全局配置', icon: Settings }]

const sessions = ref<SessionItem[]>([
  createSession('后台权限管理模块', {
    time: '2 小时前',
    summary: '支持 RBAC、角色可视化配置与权限指令预留。'
  }),
  createSession('电商平台重构计划', {
    time: '10 分钟前',
    summary: '分析商品、订单、营销模块的拆分节奏。',
    currentStage: 'design'
  }),
  createSession('用户中心 API 校验流', {
    time: '昨天',
    summary: '补齐 schema 校验与错误态回放。',
    currentStage: 'verify'
  }),
  createSession('数据看板图表工作流', {
    time: '2 天前',
    summary: '梳理图表查询、转换和工作流编排。',
    currentStage: 'workflow'
  })
])

const selectedSessionId = ref(sessions.value[0]?.id ?? '')

const plannedSessionsCount = computed(
  () => sessions.value.filter((session) => session.planGenerated).length
)
const currentSession = computed(
  () =>
    sessions.value.find((session) => session.id === selectedSessionId.value) ?? sessions.value[0]
)
const currentSessionStageLabel = computed(() => getStageLabel(currentSession.value.currentStage))
const dashboardStageCards = computed<DashboardStageCard[]>(() => {
  return stageOrder.map((stage) => ({
    stage,
    label: getStageLabel(stage),
    count: sessions.value.filter((session) => session.currentStage === stage).length,
    color: stageMeta[stage].color
  }))
})

function createSession(
  title: string,
  options?: { time?: string; summary?: string; currentStage?: StageKey }
): SessionItem {
  return {
    id: `session-${Math.random().toString(36).slice(2, 10)}`,
    title,
    currentStage: options?.currentStage ?? 'analysis',
    time: options?.time ?? '刚刚',
    summary: options?.summary ?? '等待补充更多上下文后生成计划。',
    analysisTurnCount: 0,
    planGenerated: false,
    messages: [],
    plan: createPlanState(title),
    design: createDesignState(title)
  }
}

function createBaseDocumentState(
  title: string,
  fileName: string,
  summary: string,
  content: string
): SessionDocumentState {
  return {
    title,
    fileName,
    summary,
    content,
    diffLines: buildTextDiffLines(content),
    agentMessages: [
      {
        id: createId('copilot'),
        role: 'assistant',
        content: `我已经进入 ${title} 的 Auto Copilot 面板。你可以直接提要求，我会生成 diff 回显并自动合并最新修改。`
      }
    ],
    appliedTweaks: []
  }
}

function createPlanState(title: string): SessionPlanState {
  const steps = buildPlanSteps([])
  const content = buildPlanMarkdown(title, steps)
  const baseState = createBaseDocumentState(
    '需求分析',
    'requirement_analysis.md',
    `围绕「${title}」建立从需求分析到工作流落地的执行方案。`,
    content
  )

  return {
    ...baseState,
    steps,
    diffLines: buildTextDiffLines(content)
  }
}

function createDesignState(title: string): SessionDesignState {
  const content = buildDesignMarkdown(title, [])
  return createBaseDocumentState(
    '规划设计',
    'planning_design.md',
    `为「${title}」整理模块结构、交互流、数据流与后续校验入口。`,
    content
  )
}

function buildPlanSteps(tweaks: string[]): string[] {
  const steps = [
    '梳理核心角色、权限边界与业务约束，输出需求分析结论',
    '设计页面信息架构与关键交互流，补齐字段与状态说明',
    '整理校验策略、异常场景与联调检查项',
    '将需求、设计与校验结果收敛为可生成工作流的节点方案'
  ]

  if (tweaks.includes('mock')) {
    steps.splice(1, 0, '先提供可联调的前端 Mock 数据与状态流，保证页面能提前验证')
  }
  if (tweaks.includes('permission')) {
    steps.splice(2, 0, '补充前端 v-permission 指令与角色显隐规则，提前验证权限语义')
  }
  if (tweaks.includes('verify-first')) {
    steps.push('增加阶段性校验清单，确保设计变更后能立即回归验证')
  }

  return steps
}

function buildPlanMarkdown(sessionTitle: string, steps: string[]): string {
  return [
    `# ${sessionTitle} 需求分析`,
    '',
    '## 需求摘要',
    `- 目标：围绕 ${sessionTitle} 输出可落地的需求分析与执行计划`,
    '- 当前交互：支持 Auto Copilot 协同修改，生成 diff 回显后自动合并',
    '',
    '## 执行步骤',
    ...steps.map((step, index) => `${index + 1}. ${step}`)
  ].join('\n')
}

function buildDesignMarkdown(sessionTitle: string, tweaks: string[]): string {
  const sections = [
    '# 规划设计文档',
    '',
    `## 项目对象`,
    `${sessionTitle}`,
    '',
    '## 模块结构',
    '- 主工作区：文本编辑器承载设计正文',
    '- 右侧 Copilot：负责解释修改意图并生成 diff',
    '- 自动批准：生成 diff 回显后直接合并正文，不需要二次确认',
    '',
    '## 交互流程',
    '1. 用户直接编辑正文或提出设计要求',
    '2. Auto Copilot 产出结构化修改建议',
    '3. 生成 diff 回显并自动合并到正文',
    '',
    '## 数据与状态',
    '- 当前仍为本地 mock 状态',
    '- 后续可平滑接入真实 session / store / IPC'
  ]

  if (tweaks.includes('module-breakdown')) {
    sections.push(
      '',
      '## 模块拆分补充',
      '- 补充子模块职责与依赖边界',
      '- 明确组件树与文档结构的映射关系'
    )
  }
  if (tweaks.includes('dataflow')) {
    sections.push('', '## 数据流补充', '- 列出输入来源、文档变更、diff 暂存、确认合并四段状态流')
  }
  if (tweaks.includes('timeline')) {
    sections.push('', '## 时序补充', '- 增加 Auto Copilot 生成 diff 到确认合并的时序说明')
  }

  return sections.join('\n')
}

function buildTextDiffLines(content: string): DiffLine[] {
  return content.split('\n').map((line, index) => ({
    num: index + 1,
    type: 'context',
    text: line
  }))
}

function buildModifiedDiffLines(previousContent: string, nextContent: string): DiffLine[] {
  const previousLines = previousContent.split('\n')
  const nextLines = nextContent.split('\n')
  const maxLength = Math.max(previousLines.length, nextLines.length)
  const lines: DiffLine[] = []
  let lineNumber = 1

  for (let index = 0; index < maxLength; index += 1) {
    const previousLine = previousLines[index]
    const nextLine = nextLines[index]

    if (previousLine === nextLine && nextLine !== undefined) {
      lines.push({ num: lineNumber, type: 'context', text: nextLine })
      lineNumber += 1
      continue
    }

    if (previousLine !== undefined) {
      lines.push({ num: null, type: 'removed', text: previousLine })
    }

    if (nextLine !== undefined) {
      lines.push({ num: lineNumber, type: 'added', text: nextLine })
      lineNumber += 1
    }
  }

  return lines
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function getStageLabel(stage: StageKey): string {
  return stageMeta[stage].label
}

function getSessionStageDotClass(currentStage: StageKey, stage: StageKey): string {
  return [
    'rounded-full transition-all duration-200',
    currentStage === stage ? stageMeta[stage].activeDot : stageMeta[stage].idleDot
  ].join(' ')
}

function updateCurrentSession(mutator: (session: SessionItem) => void): void {
  const target = sessions.value.find((session) => session.id === selectedSessionId.value)
  if (!target) return
  mutator(target)
}

function getActiveDocument(session: SessionItem, mode: CopilotMode): SessionDocumentState {
  return mode === 'analysis' ? session.plan : session.design
}

function handleSelectSession(sessionId: string, nextMenu: MenuValue = 'analysis'): void {
  selectedSessionId.value = sessionId
  activeMenu.value = nextMenu
}

async function streamAssistantMessage(content: string, afterStream?: () => void): Promise<void> {
  updateCurrentSession((session) => {
    session.messages.push({
      id: createId('analysis-message'),
      role: 'assistant',
      kind: 'text',
      content: '',
      streaming: true
    })
  })

  for (const char of content) {
    await wait(18)
    updateCurrentSession((session) => {
      const message = session.messages[session.messages.length - 1]
      if (message && message.role === 'assistant') message.content += char
    })
  }

  updateCurrentSession((session) => {
    const message = session.messages[session.messages.length - 1]
    if (message && message.role === 'assistant') message.streaming = false
  })

  afterStream?.()
}

async function handleSendAnalysis(): Promise<void> {
  const content = analysisInput.value.trim()
  if (!content || isAnalysisStreaming.value) return

  analysisInput.value = ''
  updateCurrentSession((session) => {
    session.messages.push({ id: createId('analysis-message'), role: 'user', kind: 'text', content })
    session.analysisTurnCount += 1
    session.time = '刚刚'
  })

  const turnCount = currentSession.value.analysisTurnCount
  isAnalysisStreaming.value = true

  if (turnCount === 1) {
    await streamAssistantMessage(
      '收到，我会先从业务目标、角色边界和关键页面入口三个方向拆解需求，再决定后续分析重点。'
    )
  } else if (turnCount === 2) {
    await streamAssistantMessage(
      '我已经补齐第一轮分析：当前最关键的是把角色、权限点、页面操作链路说清楚。再补一次，我就开始生成执行计划。'
    )
  } else {
    await streamAssistantMessage(
      '上下文已经足够，我现在开始整理需求摘要、执行步骤和后续设计落点，并生成一份可继续编辑的计划。',
      () => {
        updateCurrentSession((session) => {
          session.planGenerated = true
          session.summary =
            '计划已生成，需求分析与规划设计都支持 Auto Copilot 自动合并与 diff 回显。'
          session.messages.push({
            id: createId('analysis-message'),
            role: 'system',
            kind: 'plan-card',
            content: 'plan-generated'
          })
          session.plan.content = buildPlanMarkdown(session.title, session.plan.steps)
          session.plan.diffLines = buildTextDiffLines(session.plan.content)
        })
      }
    )
  }

  isAnalysisStreaming.value = false
}

function openCopilotPanel(mode: CopilotMode): void {
  activeRightPanel.value = mode
  if (mode === 'analysis') {
    updateCurrentSession((session) => {
      session.currentStage = 'analysis'
      session.summary = '需求分析已进入自动协同修改状态，右侧会展示 diff 回显并自动合并。'
    })
  }
}

function enterDesignView(): void {
  updateCurrentSession((session) => {
    session.currentStage = 'design'
    session.summary =
      '已进入规划设计阶段，主区可编辑正文，右侧可通过 Auto Copilot 生成 diff 回显并自动合并。'
  })
  activeMenu.value = 'design'
  openCopilotPanel('design')
}

function closeRightPanel(): void {
  activeRightPanel.value = null
  isRightPanelFullscreen.value = false
}

function openCreateSessionModal(): void {
  newSessionName.value = ''
  showCreateSessionModal.value = true
}

function closeCreateSessionModal(): void {
  showCreateSessionModal.value = false
}

function handleCreateSession(): void {
  const title = newSessionName.value.trim()
  if (!title) return

  const session = createSession(title, {
    time: '刚刚',
    summary: '新会话已创建，等待第一轮需求输入。'
  })
  sessions.value.unshift(session)
  selectedSessionId.value = session.id
  activeMenu.value = 'analysis'
  showCreateSessionModal.value = false
}

function handleUpdateDesignContent(value: string): void {
  updateCurrentSession((session) => {
    session.design.content = value
    session.design.summary =
      '设计正文已手动编辑，可以继续用右侧 Auto Copilot 生成 diff 回显并自动合并。'
    session.time = '刚刚'
  })
}
function handleSendCopilotMessage(): void {
  const content = copilotInput.value.trim()
  if (!content || !activeRightPanel.value) return

  const mode = activeRightPanel.value
  copilotInput.value = ''

  updateCurrentSession((session) => {
    const document = getActiveDocument(session, mode)
    document.agentMessages.push({ id: createId('copilot'), role: 'user', content })
  })

  const tweaks = inferTweaksFromPrompt(content, mode)

  updateCurrentSession((session) => {
    const document = getActiveDocument(session, mode)
    const nextTweaks = Array.from(new Set([...document.appliedTweaks, ...tweaks]))
    document.appliedTweaks = nextTweaks

    let nextContent = document.content
    if (mode === 'analysis') {
      session.plan.steps = buildPlanSteps(nextTweaks)
      nextContent = buildPlanMarkdown(session.title, session.plan.steps)
      session.plan.summary = `围绕「${session.title}」的需求分析已根据对话追加 ${nextTweaks.length} 条偏好，并自动合并最新修改。`
    } else {
      nextContent = buildDesignMarkdown(session.title, nextTweaks)
      session.design.summary = `规划设计已根据对话生成 ${nextTweaks.length} 轮结构化修改建议，并自动合并最新修改。`
    }

    document.agentMessages.push({
      id: createId('copilot'),
      role: 'function',
      content: `update_${mode}_document({ tweaks: [${nextTweaks.map((item) => `'${item}'`).join(', ')}] })`
    })
    document.agentMessages.push({
      id: createId('copilot'),
      role: 'assistant',
      content: buildCopilotReply(nextTweaks, mode)
    })
    document.diffLines = buildModifiedDiffLines(document.content, nextContent)
    document.content = nextContent
    session.summary = mode === 'analysis' ? session.plan.summary : session.design.summary
    session.time = '刚刚'

    if (mode === 'analysis') {
      session.currentStage = 'design'
    } else {
      session.currentStage = 'verify'
    }
  })
}

function inferTweaksFromPrompt(prompt: string, mode: CopilotMode): string[] {
  const tweaks: string[] = []
  const normalized = prompt.toLowerCase()

  if (mode === 'analysis') {
    if (normalized.includes('mock')) tweaks.push('mock')
    if (prompt.includes('权限') || normalized.includes('permission')) tweaks.push('permission')
    if (prompt.includes('校验') || prompt.includes('验证') || normalized.includes('verify'))
      tweaks.push('verify-first')
  } else {
    if (prompt.includes('模块') || prompt.includes('拆')) tweaks.push('module-breakdown')
    if (prompt.includes('数据流') || prompt.includes('状态流')) tweaks.push('dataflow')
    if (prompt.includes('时序') || prompt.includes('流程')) tweaks.push('timeline')
  }

  if (tweaks.length === 0) tweaks.push(mode === 'analysis' ? 'mock' : 'module-breakdown')
  return tweaks
}

function buildCopilotReply(tweaks: string[], mode: CopilotMode): string {
  const parts: string[] = []

  if (mode === 'analysis') {
    if (tweaks.includes('mock')) parts.push('已把前端 Mock 前移。')
    if (tweaks.includes('permission')) parts.push('已补充权限语义与指令约束。')
    if (tweaks.includes('verify-first')) parts.push('已增加阶段性校验清单。')
  } else {
    if (tweaks.includes('module-breakdown')) parts.push('已补充模块拆分与职责边界。')
    if (tweaks.includes('dataflow')) parts.push('已补充数据流与状态流说明。')
    if (tweaks.includes('timeline')) parts.push('已补充时序化设计描述。')
  }

  return `${parts.join('')} 我已经自动合并修改，你可以直接查看右侧 diff 回显。`
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
</script>

<style scoped src="./generate-view.scss"></style>
