<template>
  <div :class="containerClass">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <span :class="statusBadgeClass">
            {{
              block.status === 'ready'
                ? '规划已就绪'
                : block.streamingState?.isStreaming
                  ? '规划生成中'
                  : '规划草案'
            }}
          </span>
          <span class="rounded-full bg-white px-2 py-0.5 text-[10px] text-gray-500">
            触发方式：{{ block.trigger === 'explicit' ? '用户显式要求' : '自动识别成熟度' }}
          </span>
          <span class="rounded-full bg-white px-2 py-0.5 text-[10px] text-gray-500">
            缺口 {{ block.missingQuestions.length }}
          </span>
          <span class="rounded-full bg-white px-2 py-0.5 text-[10px] text-gray-500">
            信号 {{ block.readinessSignals.length }}
          </span>
        </div>

        <div class="mt-3 text-[13px] font-semibold text-gray-800">{{ block.summary }}</div>
      </div>

      <div :class="statusPanelClass">
        <div class="text-[11px] font-semibold">{{ statusHeadline }}</div>
        <div class="mt-1 text-[11px] leading-5 opacity-80">{{ statusDescription }}</div>
      </div>
    </div>

    <div class="mt-4 grid gap-3 xl:grid-cols-2">
      <section class="rounded-xl border border-cyan-200 bg-cyan-50/65 p-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="text-[11px] font-semibold uppercase tracking-wide text-cyan-700">
              需求分析
            </div>
            <div class="mt-1 text-[11px] text-cyan-700/80">先整理目标、成功标准、约束与缺口</div>
          </div>
          <span :class="getSectionBadgeClass('analysis')">
            {{ getSectionStatusLabel('analysis') }}
          </span>
        </div>

        <div class="mt-3 space-y-3">
          <section class="rounded-lg border border-white/70 bg-white/85 p-3">
            <div class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">目标</div>
            <template v-if="shouldShowFieldSkeleton('goals')">
              <FieldSkeleton :rows="2" />
            </template>
            <ul v-else class="mt-2 space-y-1 text-[12px] leading-5 text-gray-700">
              <li v-for="item in block.requirementDocument.goals" :key="`goal-${item}`">
                - {{ item }}
              </li>
              <li v-if="block.requirementDocument.goals.length === 0" class="text-gray-400">
                暂无
              </li>
            </ul>
          </section>

          <section class="rounded-lg border border-white/70 bg-white/85 p-3">
            <div class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              成功标准
            </div>
            <template v-if="shouldShowFieldSkeleton('success_criteria')">
              <FieldSkeleton :rows="2" />
            </template>
            <ul v-else class="mt-2 space-y-1 text-[12px] leading-5 text-gray-700">
              <li
                v-for="item in block.requirementDocument.success_criteria"
                :key="`success-${item}`"
              >
                - {{ item }}
              </li>
              <li
                v-if="block.requirementDocument.success_criteria.length === 0"
                class="text-gray-400"
              >
                暂无
              </li>
            </ul>
          </section>

          <section class="rounded-lg border border-white/70 bg-white/85 p-3">
            <div class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">约束</div>
            <template v-if="shouldShowFieldSkeleton('constraints')">
              <FieldSkeleton :rows="2" />
            </template>
            <ul v-else class="mt-2 space-y-1 text-[12px] leading-5 text-gray-700">
              <li v-for="item in block.requirementDocument.constraints" :key="`constraint-${item}`">
                - {{ item }}
              </li>
              <li v-if="block.requirementDocument.constraints.length === 0" class="text-gray-400">
                暂无
              </li>
            </ul>
          </section>

          <section class="rounded-lg border border-white/70 bg-white/85 p-3">
            <div class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              禁止项
            </div>
            <template v-if="shouldShowFieldSkeleton('prohibitions')">
              <FieldSkeleton :rows="2" />
            </template>
            <ul v-else class="mt-2 space-y-1 text-[12px] leading-5 text-gray-700">
              <li
                v-for="item in block.requirementDocument.prohibitions"
                :key="`prohibition-${item}`"
              >
                - {{ item }}
              </li>
              <li v-if="block.requirementDocument.prohibitions.length === 0" class="text-gray-400">
                暂无
              </li>
            </ul>
          </section>

          <section class="rounded-lg border border-white/70 bg-white/85 p-3">
            <div class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              当前仍缺的信息
            </div>
            <template v-if="shouldShowFieldSkeleton('missingQuestions')">
              <FieldSkeleton :rows="2" />
            </template>
            <ul v-else class="mt-2 space-y-1 text-[12px] leading-5 text-gray-700">
              <li v-for="item in block.missingQuestions" :key="`missing-${item}`">- {{ item }}</li>
              <li v-if="block.missingQuestions.length === 0" class="text-gray-400">暂无</li>
            </ul>
          </section>

          <section class="rounded-lg border border-white/70 bg-white/85 p-3">
            <div class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              已具备的规划信号
            </div>
            <template v-if="shouldShowFieldSkeleton('readinessSignals')">
              <FieldSkeleton :rows="2" />
            </template>
            <ul v-else class="mt-2 space-y-1 text-[12px] leading-5 text-gray-700">
              <li v-for="item in block.readinessSignals" :key="`signal-${item}`">- {{ item }}</li>
              <li v-if="block.readinessSignals.length === 0" class="text-gray-400">暂无</li>
            </ul>
          </section>
        </div>
      </section>

      <section class="rounded-xl border border-emerald-200 bg-emerald-50/65 p-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
              设计交接
            </div>
            <div class="mt-1 text-[11px] text-emerald-700/80">
              再整理候选节点、输入输出和蓝图要求
            </div>
          </div>
          <span :class="getSectionBadgeClass('design')">{{ getSectionStatusLabel('design') }}</span>
        </div>

        <div class="mt-3 space-y-3">
          <section class="rounded-lg border border-white/70 bg-white/85 p-3">
            <div class="flex items-center justify-between gap-3">
              <div class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                候选节点
              </div>
              <div class="text-[10px] text-gray-400">用于给后续蓝图阶段提供落点</div>
            </div>
            <template v-if="shouldShowFieldSkeleton('candidate_nodes')">
              <FieldSkeleton :rows="3" />
            </template>
            <div v-else class="mt-2 space-y-2">
              <div
                v-for="candidate in block.requirementDocument.candidate_nodes"
                :key="`${candidate.type}-${candidate.reason}`"
                class="rounded-md border border-amber-100 bg-amber-50/60 px-3 py-2"
              >
                <div class="text-[12px] font-semibold text-gray-800">{{ candidate.type }}</div>
                <div class="mt-1 text-[12px] leading-5 text-gray-600">{{ candidate.reason }}</div>
              </div>
              <div
                v-if="block.requirementDocument.candidate_nodes.length === 0"
                class="text-[12px] text-gray-400"
              >
                暂无候选节点。
              </div>
            </div>
          </section>

          <section class="rounded-lg border border-white/70 bg-white/85 p-3">
            <div class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              输入要求
            </div>
            <template v-if="shouldShowFieldSkeleton('input_requirements')">
              <FieldSkeleton :rows="2" />
            </template>
            <ul v-else class="mt-2 space-y-1 text-[12px] leading-5 text-gray-700">
              <li
                v-for="item in block.requirementDocument.input_requirements"
                :key="`input-${item}`"
              >
                - {{ item }}
              </li>
              <li
                v-if="block.requirementDocument.input_requirements.length === 0"
                class="text-gray-400"
              >
                暂无
              </li>
            </ul>
          </section>

          <section class="rounded-lg border border-white/70 bg-white/85 p-3">
            <div class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              输出要求
            </div>
            <template v-if="shouldShowFieldSkeleton('output_requirements')">
              <FieldSkeleton :rows="2" />
            </template>
            <ul v-else class="mt-2 space-y-1 text-[12px] leading-5 text-gray-700">
              <li
                v-for="item in block.requirementDocument.output_requirements"
                :key="`output-${item}`"
              >
                - {{ item }}
              </li>
              <li
                v-if="block.requirementDocument.output_requirements.length === 0"
                class="text-gray-400"
              >
                暂无
              </li>
            </ul>
          </section>

          <section class="rounded-lg border border-white/70 bg-white/85 p-3">
            <div class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              待确认问题
            </div>
            <template v-if="shouldShowFieldSkeleton('human_confirmation_questions')">
              <FieldSkeleton :rows="2" />
            </template>
            <ul v-else class="mt-2 space-y-1 text-[12px] leading-5 text-gray-700">
              <li v-for="item in combinedQuestions" :key="`question-${item}`">- {{ item }}</li>
              <li v-if="combinedQuestions.length === 0" class="text-gray-400">暂无</li>
            </ul>
          </section>

          <section class="rounded-lg border border-white/70 bg-white/85 p-3">
            <div class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              给蓝图阶段的硬要求
            </div>
            <template v-if="shouldShowFieldSkeleton('blueprint_requirements')">
              <FieldSkeleton :rows="2" />
            </template>
            <ul v-else class="mt-2 space-y-1 text-[12px] leading-5 text-gray-700">
              <li
                v-for="item in block.requirementDocument.blueprint_requirements"
                :key="`blueprint-${item}`"
              >
                - {{ item }}
              </li>
              <li
                v-if="block.requirementDocument.blueprint_requirements.length === 0"
                class="text-gray-400"
              >
                暂无
              </li>
            </ul>
          </section>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
  GenerationPlanningBlockFieldKey,
  GenerationPlanningBlockPayload,
  GenerationPlanningStreamSectionKey
} from '@preload/types'
import FieldSkeleton from './GeneratePlanningBlockFieldSkeleton.vue'

const props = defineProps<{
  block: GenerationPlanningBlockPayload
}>()

const analysisFieldKeys: GenerationPlanningBlockFieldKey[] = [
  'goals',
  'success_criteria',
  'constraints',
  'prohibitions',
  'missingQuestions',
  'readinessSignals'
]

const designFieldKeys: GenerationPlanningBlockFieldKey[] = [
  'candidate_nodes',
  'input_requirements',
  'output_requirements',
  'human_confirmation_questions',
  'blueprint_requirements'
]

/**
 * 规划块里有两类问题来源：
 * - requirementDocument.human_confirmation_questions：正式 handoff 里的确认项
 * - missingQuestions：这轮规划仍缺什么
 *
 * 这里合并展示，用户一眼就能看到接下来还要补什么。
 */
const combinedQuestions = computed(() => {
  return Array.from(
    new Set([
      ...props.block.requirementDocument.human_confirmation_questions,
      ...props.block.missingQuestions
    ])
  )
})

const containerClass = computed(() => {
  if (props.block.streamingState?.isStreaming) {
    return 'of-generate-planning-block mt-3 rounded-xl border border-sky-200 bg-sky-50/70 p-4'
  }
  return props.block.status === 'ready'
    ? 'of-generate-planning-block mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4'
    : 'of-generate-planning-block mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4'
})

const statusBadgeClass = computed(() => {
  if (props.block.streamingState?.isStreaming) {
    return 'rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700'
  }
  return props.block.status === 'ready'
    ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700'
    : 'rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700'
})

const statusPanelClass = computed(() => {
  if (props.block.streamingState?.isStreaming) {
    return 'rounded-lg border border-sky-200 bg-white/85 px-3 py-2 text-sky-700 md:w-56'
  }
  return props.block.status === 'ready'
    ? 'rounded-lg border border-emerald-200 bg-white/85 px-3 py-2 text-emerald-700 md:w-56'
    : 'rounded-lg border border-amber-200 bg-white/85 px-3 py-2 text-amber-700 md:w-56'
})

const statusHeadline = computed(() => {
  if (props.block.streamingState?.isStreaming) {
    return props.block.streamingState.activeSection === 'analysis'
      ? '正在生成需求分析块'
      : '正在生成设计交接块'
  }
  return props.block.status === 'ready' ? '可以交给蓝图阶段' : '仍建议继续澄清'
})

const statusDescription = computed(() => {
  if (props.block.streamingState?.isStreaming) {
    return '当前会先挂出两个 message block 骨架，再随着模型生成逐个填入内容。'
  }
  if (props.block.status === 'ready') {
    return '当前规划已经满足 requirement handoff 的基本条件。'
  }
  return '当前规划已经有方向，但还存在待确认缺口，适合继续追问后再定稿。'
})

function shouldShowFieldSkeleton(fieldKey: GenerationPlanningBlockFieldKey): boolean {
  if (!props.block.streamingState?.isStreaming) {
    return false
  }
  return !props.block.streamingState.completedFieldKeys.includes(fieldKey)
}

function getSectionStatusLabel(section: GenerationPlanningStreamSectionKey): string {
  if (!props.block.streamingState?.isStreaming) {
    return section === 'analysis' ? '已完成' : props.block.status === 'ready' ? '已完成' : '待确认'
  }
  if (props.block.streamingState.activeSection === section) {
    return '生成中'
  }
  const fieldKeys = section === 'analysis' ? analysisFieldKeys : designFieldKeys
  const allDone = fieldKeys.every((fieldKey) =>
    props.block.streamingState?.completedFieldKeys.includes(fieldKey)
  )
  return allDone ? '已加载' : '等待中'
}

function getSectionBadgeClass(section: GenerationPlanningStreamSectionKey): string {
  const label = getSectionStatusLabel(section)
  if (label === '生成中') {
    return 'rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700'
  }
  if (label === '已加载' || label === '已完成') {
    return 'rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700'
  }
  return 'rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500'
}
</script>
