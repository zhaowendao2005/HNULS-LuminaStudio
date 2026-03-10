<template>
  <div
    class="of-generator-workbench of-generator-view flex h-full w-full overflow-hidden bg-white text-gray-900"
  >
    <div class="flex h-full w-full flex-col overflow-hidden">
      <header
        class="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50/50 px-4"
      >
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <div
              class="flex h-4 w-4 items-center justify-center rounded-sm bg-gray-800 text-[10px] text-white"
            >
              工
            </div>
            <span class="text-[13px] font-semibold">工作流生成工作台</span>
          </div>
          <div class="h-4 w-px bg-gray-300"></div>
          <div class="flex items-center gap-2 text-xs">
            <span class="text-gray-500">会话:</span>
            <code class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-800">
              {{ session?.id || '未加载' }}
            </code>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="rounded border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-cyan-500 hover:text-cyan-700"
            @click="configDrawerVisible = true"
          >
            生成配置
          </button>
          <button
            type="button"
            class="text-xs font-medium text-gray-500 transition-colors hover:text-gray-900"
            @click="$emit('back')"
          >
            返回列表
          </button>
          <div
            class="flex items-center gap-1.5 text-xs font-semibold"
            :class="connectionTone.className"
          >
            <div class="h-2 w-2 rounded-full" :class="connectionTone.dotClass"></div>
            {{ connectionTone.label }}
          </div>
        </div>
      </header>

      <div class="flex min-h-0 flex-1 overflow-hidden">
        <aside class="w-[220px] shrink-0 border-r border-gray-200 bg-gray-50/50 py-3">
          <div class="px-4 pb-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-gray-700">
              生成阶段
            </span>
          </div>
          <nav class="flex flex-col gap-0.5 px-2">
            <button
              v-for="tab in stageTabs"
              :key="tab.id"
              type="button"
              class="flex items-center gap-2 rounded-md border px-2 py-2 text-left transition-colors"
              :class="
                activeStage === tab.id
                  ? 'border-gray-200/60 bg-white text-gray-900 shadow-sm'
                  : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              "
              @click="activeStage = tab.id"
            >
              <span class="w-4 text-[11px] font-bold text-gray-400">{{ tab.num }}</span>
              <span
                class="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-bold"
                :class="
                  activeStage === tab.id ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-200 text-gray-500'
                "
              >
                {{ tab.icon }}
              </span>
              <span class="flex-1 text-[13px] font-medium">{{ tab.label }}</span>
              <div class="h-1.5 w-1.5 rounded-full" :class="tab.dotClass"></div>
            </button>
          </nav>
        </aside>

        <main class="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <section v-if="activeStage === 'overview'" class="flex-1 overflow-auto p-6">
            <div class="flex max-w-5xl flex-col gap-6">
              <div>
                <h3 class="mb-2 text-[13px] font-semibold uppercase tracking-wider text-gray-800">
                  会话初始化信息
                </h3>
                <div class="mt-3 flex flex-wrap gap-x-8 gap-y-4">
                  <div class="flex flex-col gap-2">
                    <span class="text-xs text-gray-500">工作流名称</span>
                    <span class="text-[13px] font-semibold text-gray-900">
                      {{ session?.workflow_name || '未命名工作流' }}
                    </span>
                  </div>
                  <div class="flex flex-col gap-2">
                    <span class="text-xs text-gray-500">当前阶段</span>
                    <span class="font-mono text-[13px] text-cyan-700">
                      {{ phaseLabelMap[currentPhase] }}
                    </span>
                  </div>
                  <div class="flex flex-col gap-2">
                    <span class="text-xs text-gray-500">会话状态</span>
                    <span class="font-mono text-[13px] text-gray-800">
                      {{ statusLabelMap[currentStatus] }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="h-px w-full bg-gray-100"></div>

              <div>
                <h3 class="mb-2 text-[13px] font-semibold uppercase tracking-wider text-gray-800">
                  当前可用能力
                </h3>
                <div class="mt-3 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-4">
                  <div
                    v-for="item in capabilityRows"
                    :key="item.label"
                    class="flex items-center justify-between border-b border-gray-100 py-1.5"
                  >
                    <span class="text-[13px] font-medium text-gray-800">{{ item.label }}</span>
                    <span class="text-xs font-semibold uppercase" :class="item.toneClass">
                      {{ item.value }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="rounded border border-gray-200 bg-white p-4 shadow-sm">
                <div class="flex flex-col gap-2">
                  <span class="text-xs font-semibold uppercase tracking-wider text-gray-700">
                    当前提示词
                  </span>
                  <p class="text-[13px] leading-6 text-gray-800">
                    {{ draftPrompt || '还没有输入提示词。' }}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section v-else-if="activeStage === 'prompt'" class="flex h-full min-h-0">
            <div class="flex min-w-0 flex-1 flex-col overflow-auto bg-white">
              <div class="border-b border-gray-100 bg-white px-4 py-3">
                <h3 class="text-[13px] font-semibold uppercase tracking-wider text-gray-800">
                  提示词输入
                </h3>
              </div>

              <div class="flex-1 overflow-auto bg-gray-50/30 p-6">
                <div class="mx-auto flex max-w-3xl flex-col gap-4">
                  <div class="rounded border border-gray-200 bg-white p-5 shadow-sm">
                    <div class="mb-3 flex items-center justify-between">
                      <span class="text-xs font-semibold uppercase tracking-wider text-gray-700">
                        需求提示词
                      </span>
                      <button
                        type="button"
                        class="rounded-md bg-gray-900 px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-gray-800"
                        @click="handleSendPrompt"
                      >
                        发送生成
                      </button>
                    </div>
                    <textarea
                      v-model="draftPrompt"
                      class="min-h-[360px] w-full resize-none border border-gray-200 bg-white px-4 py-3 text-[13px] leading-7 text-gray-800 outline-none focus:border-cyan-500"
                      placeholder="请描述你想生成的工作流、节点、分支和输出要求"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="flex w-[380px] shrink-0 flex-col bg-gray-50/50">
              <div
                class="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-4 py-3"
              >
                <h3 class="text-[13px] font-semibold uppercase tracking-wider text-gray-800">
                  实际注入视角
                </h3>
                <button
                  type="button"
                  class="flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-gray-900"
                  @click="copyText(promptPayloadJson)"
                >
                  复制全文
                </button>
              </div>
              <div class="flex flex-col gap-4 overflow-auto p-4">
                <span class="text-xs leading-5 text-gray-500">
                  这里模拟生成引擎收到的提示词、阶段配置与检查点上下文，便于核对语义。
                </span>

                <div
                  class="rounded-md bg-gray-900 p-3 font-mono text-[12px] leading-relaxed text-gray-300 shadow-inner"
                >
                  <span class="text-purple-400">Prompt:</span>
                  <span class="text-green-300">{{ draftPrompt || '(empty)' }}</span>
                  <br />
                  <br />
                  <span class="text-purple-400">Phase:</span>
                  {{ phaseLabelMap[currentPhase] }}
                  <br />
                  <span class="text-purple-400">Checkpoints:</span>
                  {{ checkpoints.length }}
                  <br />
                  <span class="text-purple-400">Models:</span>
                  <br />
                  <div v-for="phase in phaseOrder" :key="`${phase}-markdown`" class="pl-2">
                    -
                    <span class="text-yellow-200">{{ phaseLabelMap[phase] }}</span>
                    : {{ phaseModels[phase]?.model || '未指定' }}
                  </div>
                </div>

                <div class="flex flex-col gap-1 border-l-2 border-amber-400 py-1 pl-3">
                  <span class="flex items-center gap-1 text-[12px] font-semibold text-amber-700">
                    调优建议
                  </span>
                  <span class="text-xs text-amber-700/80">
                    {{
                      draftPrompt.length < 24
                        ? '提示词较短，建议补充节点目标、输入来源和输出约束。'
                        : '提示词长度合适，可以继续推进规划与拓扑生成。'
                    }}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section v-else-if="activeStage === 'plan'" class="flex h-full min-h-0">
            <div class="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
              <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <h3 class="text-[13px] font-semibold uppercase tracking-wider text-gray-800">
                  规划条目
                </h3>
              </div>
              <div class="flex-1 overflow-y-auto">
                <button
                  v-for="(item, idx) in planItems"
                  :key="item.id"
                  type="button"
                  class="w-full border-b border-gray-50 px-4 py-2.5 text-left"
                  :class="selectedPlanIndex === idx ? 'bg-cyan-50/30' : 'hover:bg-gray-50'"
                  @click="selectedPlanIndex = idx"
                >
                  <div class="flex flex-col gap-0.5">
                    <span
                      class="text-[13px]"
                      :class="
                        selectedPlanIndex === idx ? 'font-semibold text-cyan-700' : 'text-gray-800'
                      "
                    >
                      {{ item.title }}
                    </span>
                    <span class="w-48 truncate text-[11px] text-gray-500">
                      {{ item.detail || '暂无详细说明' }}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <div class="flex-1 overflow-auto bg-gray-50/30 p-4">
              <div class="flex max-w-3xl flex-col gap-4">
                <div class="rounded border border-gray-200 bg-white p-4 shadow-sm">
                  <span class="text-xs font-semibold uppercase tracking-wider text-gray-700">
                    规划说明
                  </span>
                  <p class="mt-2 text-[13px] text-gray-800">
                    {{ selectedPlanItem?.detail || '当前还没有生成规划草案。' }}
                  </p>
                </div>

                <div class="flex flex-col gap-2">
                  <h3 class="text-[13px] font-semibold uppercase tracking-wider text-gray-800">
                    条目清单
                  </h3>
                  <div
                    v-for="item in planItems"
                    :key="`${item.id}-detail`"
                    class="rounded border border-gray-100 bg-white px-3 py-3 shadow-sm"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <div class="text-[13px] font-semibold text-gray-900">{{ item.title }}</div>
                      <span
                        class="rounded px-2 py-0.5 text-[11px] font-semibold"
                        :class="planStatusToneMap[item.status]"
                      >
                        {{ planStatusLabelMap[item.status] }}
                      </span>
                    </div>
                    <p class="mt-2 text-xs leading-5 text-gray-500">
                      {{ item.detail || '暂无详细说明。' }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section v-else-if="activeStage === 'topology'" class="flex h-full min-h-0">
            <div class="flex w-80 shrink-0 flex-col border-r border-gray-200 bg-white">
              <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <h3 class="text-[13px] font-semibold uppercase tracking-wider text-gray-800">
                  资源摘要
                </h3>
              </div>
              <div class="flex-1 overflow-y-auto">
                <button
                  v-for="resource in topologyResources"
                  :key="resource.id"
                  type="button"
                  class="w-full border-b border-gray-50 px-4 py-2.5 text-left"
                  :class="selectedResourceId === resource.id ? 'bg-cyan-50/30' : 'hover:bg-gray-50'"
                  @click="selectedResourceId = resource.id"
                >
                  <div class="flex flex-col gap-0.5">
                    <span class="text-[13px] text-gray-800">{{ resource.name }}</span>
                    <span class="w-64 truncate font-mono text-[11px] text-cyan-600">
                      {{ resource.meta }}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <div class="flex min-w-0 flex-1 flex-col overflow-auto bg-white">
              <div class="sticky top-0 z-10 flex flex-col border-b border-gray-100 bg-white">
                <div class="px-4 pt-3 pb-1">
                  <h3 class="text-[13px] font-semibold uppercase tracking-wider text-gray-800">
                    图谱与拓扑详情
                  </h3>
                </div>
                <div class="flex gap-4 border-t border-gray-50 px-4 text-[12px] font-medium">
                  <button
                    type="button"
                    class="border-b-2 py-1.5 transition-colors"
                    :class="
                      topologyViewMode === 'visual'
                        ? 'border-gray-800 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    "
                    @click="topologyViewMode = 'visual'"
                  >
                    内容预览
                  </button>
                  <button
                    type="button"
                    class="border-b-2 py-1.5 transition-colors"
                    :class="
                      topologyViewMode === 'raw'
                        ? 'border-gray-800 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    "
                    @click="topologyViewMode = 'raw'"
                  >
                    原始拓扑数据
                  </button>
                </div>
              </div>

              <div class="flex-1 overflow-auto bg-gray-50/30 p-4">
                <div v-if="topologyViewMode === 'visual'" class="flex max-w-4xl flex-col gap-4">
                  <div
                    class="flex flex-wrap items-center gap-8 rounded border border-gray-100 bg-white p-3 shadow-sm"
                  >
                    <div class="flex flex-col gap-1">
                      <span class="text-xs font-semibold uppercase tracking-wider text-gray-700">
                        节点数
                      </span>
                      <span class="font-mono text-[13px] font-semibold text-emerald-600">
                        {{ summary.node_count }}
                      </span>
                    </div>
                    <div class="flex flex-col gap-1">
                      <span class="text-xs font-semibold uppercase tracking-wider text-gray-700">
                        连线数
                      </span>
                      <span class="font-mono text-[13px] text-gray-700">
                        {{ summary.edge_count }}
                      </span>
                    </div>
                  </div>

                  <div class="flex flex-col gap-2">
                    <span class="text-xs font-semibold uppercase tracking-wider text-gray-700">
                      拓扑内容
                    </span>
                    <pre
                      class="whitespace-pre-wrap rounded border border-gray-200 bg-white p-4 font-mono text-[12px] text-gray-800 shadow-sm"
                      >{{ selectedTopologyContent }}</pre
                    >
                  </div>

                  <div class="flex flex-col gap-2">
                    <span class="text-xs font-semibold uppercase tracking-wider text-gray-700">
                      命名空间
                    </span>
                    <div
                      class="flex flex-wrap gap-2 rounded border border-gray-200 bg-white p-3 shadow-sm"
                    >
                      <span
                        v-for="namespace in summary.namespaces"
                        :key="namespace"
                        class="rounded bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700"
                      >
                        {{ namespace }}
                      </span>
                      <span
                        v-if="!summary.namespaces.length"
                        class="text-xs leading-5 text-gray-500"
                      >
                        暂无命名空间。
                      </span>
                    </div>
                  </div>
                </div>

                <pre
                  v-else
                  class="max-w-3xl overflow-auto rounded border border-gray-200 bg-white p-3 font-mono text-[12px] text-gray-700 shadow-sm"
                  >{{ topologyPayloadJson }}</pre
                >
              </div>
            </div>
          </section>

          <section v-else class="flex h-full min-h-0 flex-col bg-white">
            <div class="flex items-center gap-4 border-b border-gray-100 bg-gray-50/30 px-4 py-3">
              <span class="text-xs font-semibold uppercase tracking-wider text-gray-700">
                当前阶段
              </span>
              <select
                :value="currentPhase"
                class="rounded border border-gray-200 bg-white px-2 py-1 font-mono text-[13px] text-gray-800 outline-none focus:border-cyan-500"
                @change="
                  handleAdvance(($event.target as HTMLSelectElement).value as OFGenerationPhase)
                "
              >
                <option v-for="phase in phaseOrder" :key="phase" :value="phase">
                  {{ phaseLabelMap[phase] }}
                </option>
              </select>
              <div class="flex-1"></div>
              <button
                type="button"
                class="rounded-md bg-gray-900 px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                :disabled="!session?.validation.ok"
                @click="handleConfirm"
              >
                确认并打开编辑器
              </button>
            </div>

            <div class="flex min-h-0 flex-1 overflow-hidden">
              <div class="w-1/2 overflow-auto border-r border-gray-200 p-4">
                <h3 class="mb-4 text-[13px] font-semibold uppercase tracking-wider text-gray-800">
                  校验问题
                </h3>
                <div class="flex flex-col gap-3">
                  <div
                    v-for="issue in validationIssues"
                    :key="issue.id"
                    class="border-l-2 pl-3 py-1"
                    :class="issueBorderClass(issue.type)"
                  >
                    <div class="flex items-center gap-2">
                      <span class="text-[13px] font-semibold text-gray-900">{{ issue.type }}</span>
                      <span
                        v-if="issue.level === 'error'"
                        class="text-[10px] font-semibold uppercase text-rose-600"
                      >
                        阻塞
                      </span>
                    </div>
                    <div class="mt-1 text-xs text-gray-500">{{ issue.message }}</div>
                    <div v-if="issue.suggested_action" class="mt-1 text-xs text-gray-500">
                      {{ issue.suggested_action }}
                    </div>
                  </div>
                  <div
                    v-if="!validationIssues.length"
                    class="rounded border border-emerald-200 bg-emerald-50 px-3 py-4 text-xs text-emerald-700"
                  >
                    当前没有校验问题，可以直接确认编译。
                  </div>
                </div>
              </div>

              <div class="w-1/2 overflow-auto bg-gray-50/30 p-4">
                <div class="flex flex-col gap-4">
                  <h3 class="text-[13px] font-semibold uppercase tracking-wider text-gray-800">
                    生成响应
                  </h3>
                  <span class="text-xs leading-5 text-gray-500">
                    这里展示确认前的关键返回内容，包括状态、最近检查点和编译目标。
                  </span>

                  <div class="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
                    <div
                      class="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-3 py-2"
                    >
                      <span class="font-mono text-[11px] text-gray-500">
                        validation.ok: {{ session?.validation.ok ? 'true' : 'false' }}
                      </span>
                      <span class="font-mono text-[11px] text-gray-500">session.preview</span>
                    </div>
                    <div class="p-3 font-mono text-[13px] leading-relaxed text-gray-800">
                      <pre class="whitespace-pre-wrap">{{ executionPayloadJson }}</pre>
                    </div>
                  </div>

                  <div v-if="checkpoints.length" class="flex flex-col gap-2">
                    <span class="text-xs font-semibold uppercase tracking-wider text-gray-700">
                      检查点回滚
                    </span>
                    <div class="flex flex-wrap gap-2">
                      <button
                        v-for="checkpoint in checkpoints"
                        :key="checkpoint.id"
                        type="button"
                        class="rounded border border-gray-200 bg-white px-3 py-1.5 text-[12px] text-gray-700 transition-colors hover:border-cyan-500 hover:text-cyan-700"
                        @click="handleRollback(checkpoint.id)"
                      >
                        {{ checkpoint.label }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <GenerationConfigDrawer
            :visible="configDrawerVisible"
            :models="phaseModels"
            @close="configDrawerVisible = false"
            @save="handleSaveModels"
            @update-model="handleUpdateModel"
          />

          <div
            class="absolute bottom-0 left-0 right-0 flex flex-col border-t border-gray-200 bg-white transition-all duration-300"
            :class="showRawJson ? 'h-64' : 'h-8'"
          >
            <button
              type="button"
              class="flex h-8 shrink-0 items-center justify-between bg-gray-50 px-4 text-gray-600 transition-colors hover:bg-gray-100"
              @click="showRawJson = !showRawJson"
            >
              <div class="flex items-center gap-2">
                <span class="text-[11px] font-semibold uppercase tracking-wider">
                  原始协议报文 (JSON)
                </span>
              </div>
              <span class="text-sm">{{ showRawJson ? '▾' : '▸' }}</span>
            </button>

            <div v-if="showRawJson" class="flex flex-1 overflow-hidden font-mono text-[11px]">
              <div
                class="w-1/2 overflow-auto border-r border-gray-200 bg-gray-900 p-3 text-green-400"
              >
                <div class="mb-2 text-gray-500">// Request</div>
                <pre>{{ requestJson }}</pre>
              </div>
              <div class="w-1/2 overflow-auto bg-gray-900 p-3 text-cyan-400">
                <div class="mb-2 text-gray-500">// Response</div>
                <pre>{{ responseJson }}</pre>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, toRaw, watch } from 'vue'
import type {
  OFGenerationCheckpoint,
  OFGenerationGraphSummary,
  OFGenerationPhase,
  OFGenerationPhaseModelConfig,
  OFGenerationSessionStatus,
  OFGenerationValidationIssue,
  OFGenerationValidationReport
} from '@shared/Orchestraflow-types'
import {
  getOFDefaultGenerationPhaseModels,
  normalizeOFGenerationPhaseModels
} from '@shared/Orchestraflow-types'
import { useWorkflowGenerationStore } from '@renderer/stores/orchestraflow/workflow-generation/workflow-generation.store'
import GenerationConfigDrawer from './GenerationConfigDrawer.vue'

type WorkbenchStage = 'overview' | 'prompt' | 'plan' | 'topology' | 'validate'
type ViewMode = 'visual' | 'raw'

const props = defineProps<{
  sessionId: string | null
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'open-workflow', workflowId: string): void
}>()

const store = useWorkflowGenerationStore()

const phaseOrder: OFGenerationPhase[] = ['plan', 'wire', 'config', 'validate']
const phaseLabelMap: Record<OFGenerationPhase, string> = {
  plan: '规划',
  wire: '连线',
  config: '配置',
  validate: '校验'
}
const statusLabelMap: Record<OFGenerationSessionStatus, string> = {
  draft: '草稿',
  running: '进行中',
  'waiting-confirm': '待确认',
  confirmed: '已确认',
  failed: '失败'
}
const planStatusLabelMap = {
  pending: '待处理',
  ready: '已就绪',
  'needs-review': '待复核'
} as const
const planStatusToneMap = {
  pending: 'bg-amber-50 text-amber-700',
  ready: 'bg-emerald-50 text-emerald-700',
  'needs-review': 'bg-violet-50 text-violet-700'
} as const

const activeStage = ref<WorkbenchStage>('overview')
const topologyViewMode = ref<ViewMode>('visual')
const showRawJson = ref(false)
const configDrawerVisible = ref(false)
const selectedPlanIndex = ref(0)
const selectedResourceId = ref('summary')
const draftPrompt = ref('')
const phaseModels = ref<Record<OFGenerationPhase, OFGenerationPhaseModelConfig>>(
  getOFDefaultGenerationPhaseModels()
)

const emptySummary: OFGenerationGraphSummary = {
  node_count: 0,
  edge_count: 0,
  namespaces: [],
  node_types: {}
}
const emptyValidation: OFGenerationValidationReport = {
  ok: false,
  issues: [],
  checked_at: Date.now()
}

const session = computed(() => store.currentSession)
const currentPhase = computed<OFGenerationPhase>(() => session.value?.current_phase || 'plan')
const currentStatus = computed<OFGenerationSessionStatus>(() => session.value?.status || 'draft')
const summary = computed(() => session.value?.preview.summary || emptySummary)
const checkpoints = computed<OFGenerationCheckpoint[]>(() => session.value?.checkpoints || [])
const validationIssues = computed<OFGenerationValidationIssue[]>(
  () => session.value?.validation.issues || []
)

const stageTabs = computed(() => [
  {
    id: 'overview' as const,
    num: '①',
    icon: '连',
    label: '会话概览',
    dotClass: session.value ? 'bg-emerald-500' : 'bg-gray-300'
  },
  {
    id: 'prompt' as const,
    num: '②',
    icon: '词',
    label: '提示与模型',
    dotClass: draftPrompt.value ? 'bg-emerald-500' : 'bg-amber-400'
  },
  {
    id: 'plan' as const,
    num: '③',
    icon: '规',
    label: '规划草案',
    dotClass: (session.value?.preview.plan?.length || 0) > 0 ? 'bg-emerald-500' : 'bg-gray-300'
  },
  {
    id: 'topology' as const,
    num: '④',
    icon: '图',
    label: '拓扑与图谱',
    dotClass:
      (session.value?.preview.topology_text?.length || 0) > 0 ? 'bg-emerald-500' : 'bg-gray-300'
  },
  {
    id: 'validate' as const,
    num: '⑤',
    icon: '验',
    label: '校验与确认',
    dotClass: session.value?.validation.ok ? 'bg-emerald-500' : 'bg-rose-500'
  }
])

const connectionTone = computed(() => {
  if (!session.value) {
    return {
      label: '未加载',
      className: 'text-gray-500',
      dotClass: 'bg-gray-300'
    }
  }
  if (session.value.status === 'failed') {
    return {
      label: '会话异常',
      className: 'text-rose-600',
      dotClass: 'bg-rose-500'
    }
  }
  return {
    label: '已连接',
    className: 'text-emerald-600',
    dotClass: 'bg-emerald-500'
  }
})

const capabilityRows = computed(() => [
  { label: '提示词发送', value: 'Supported', toneClass: 'text-emerald-600' },
  { label: '阶段推进', value: 'Supported', toneClass: 'text-emerald-600' },
  {
    label: '检查点回滚',
    value: checkpoints.value.length ? 'Supported' : 'Idle',
    toneClass: checkpoints.value.length ? 'text-emerald-600' : 'text-gray-400'
  },
  {
    label: '确认编译',
    value: session.value?.validation.ok ? 'Ready' : 'Blocked',
    toneClass: session.value?.validation.ok ? 'text-emerald-600' : 'text-rose-600'
  }
])

const planItems = computed(() => session.value?.preview.plan || [])
const selectedPlanItem = computed(() => planItems.value[selectedPlanIndex.value] || null)

const topologyResources = computed(() => [
  {
    id: 'summary',
    name: '图谱摘要',
    meta: `nodes=${summary.value.node_count}, edges=${summary.value.edge_count}`,
    content: JSON.stringify(summary.value, null, 2)
  },
  {
    id: 'topology',
    name: '拓扑文本',
    meta: `${session.value?.preview.topology_text?.length || 0} lines`,
    content: (session.value?.preview.topology_text || []).join('\n') || '暂无拓扑内容。'
  },
  {
    id: 'validation',
    name: '校验报告',
    meta: session.value?.validation.ok ? 'ok=true' : 'ok=false',
    content: JSON.stringify(session.value?.validation || emptyValidation, null, 2)
  }
])

const selectedTopologyContent = computed(() => {
  const active = topologyResources.value.find((item) => item.id === selectedResourceId.value)
  return active?.content || '暂无内容。'
})

const promptPayloadJson = computed(() =>
  prettyJson({
    prompt: draftPrompt.value,
    phase: currentPhase.value,
    phase_models: phaseModels.value,
    checkpoints: checkpoints.value
  })
)

const topologyPayloadJson = computed(() =>
  prettyJson({
    summary: summary.value,
    topology_text: session.value?.preview.topology_text || [],
    namespaces: summary.value.namespaces
  })
)

const executionPayloadJson = computed(() =>
  prettyJson({
    validation: session.value?.validation || emptyValidation,
    compiled_workflow_id: session.value?.compiled_workflow_id || null,
    current_phase: currentPhase.value
  })
)

const requestJson = computed(() =>
  prettyJson({
    session_id: session.value?.id || props.sessionId,
    prompt: draftPrompt.value,
    action: activeStage.value,
    phase_models: phaseModels.value
  })
)

const responseJson = computed(() =>
  prettyJson({
    session: session.value || null,
    preview: session.value?.preview || null,
    validation: session.value?.validation || emptyValidation
  })
)

watch(
  () => session.value,
  (value) => {
    draftPrompt.value = value?.prompt || ''
    phaseModels.value = value?.phase_models
      ? normalizeOFGenerationPhaseModels(toRaw(value.phase_models))
      : getOFDefaultGenerationPhaseModels()
    if (selectedPlanIndex.value >= (value?.preview.plan?.length || 0)) {
      selectedPlanIndex.value = 0
    }
  },
  { immediate: true }
)

watch(
  () => props.sessionId,
  async (value) => {
    if (value) {
      await store.loadSession(value)
    }
  },
  { immediate: true }
)

onMounted(async () => {
  if (props.sessionId) {
    await store.loadSession(props.sessionId)
  }
})

async function handleSendPrompt() {
  await store.sendPrompt(draftPrompt.value)
}

async function handleAdvance(phase: OFGenerationPhase) {
  await store.advancePhase(phase)
}

async function handleRollback(checkpointId: string) {
  await store.rollbackCheckpoint(checkpointId)
}

function handleUpdateModel(
  phase: OFGenerationPhase,
  patch: string | Partial<OFGenerationPhaseModelConfig>
) {
  const normalizedPatch = typeof patch === 'string' ? { model: patch } : patch
  phaseModels.value = {
    ...phaseModels.value,
    [phase]: {
      ...phaseModels.value[phase],
      phase,
      ...normalizedPatch
    }
  }
}

async function handleSaveModels() {
  await store.updatePhaseModels(phaseModels.value)
}

async function handleConfirm() {
  const result = await store.confirmSession()
  emit('open-workflow', result.workflowId)
}

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

function issueBorderClass(type: string): string {
  if (/error|missing|invalid/i.test(type)) return 'border-rose-500'
  if (/warn|warning/i.test(type)) return 'border-amber-500'
  return 'border-cyan-500'
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    return
  }
}
</script>
