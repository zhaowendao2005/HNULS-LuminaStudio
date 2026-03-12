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
            协议：Markdown
          </span>
        </div>

        <div class="mt-3 text-[13px] font-semibold text-gray-800">{{ summaryText }}</div>
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
            <div class="mt-1 text-[11px] text-cyan-700/80">按固定标题解析 markdown 小节</div>
          </div>
          <span :class="getRootBadgeClass('analysis')">{{ getRootStatusLabel('analysis') }}</span>
        </div>

        <div class="mt-3 space-y-3">
          <PlanningSectionCard
            title="摘要"
            section-key="analysis-summary"
            :content="analysisSections['摘要']?.content || ''"
            :loading="shouldShowSectionSkeleton('analysis-summary')"
            :rows="2"
          />
          <PlanningSectionCard
            title="目标"
            section-key="analysis-goals"
            :content="analysisSections['目标']?.content || ''"
            :loading="shouldShowSectionSkeleton('analysis-goals')"
            :rows="2"
          />
          <PlanningSectionCard
            title="成功标准"
            section-key="analysis-success-criteria"
            :content="analysisSections['成功标准']?.content || ''"
            :loading="shouldShowSectionSkeleton('analysis-success-criteria')"
            :rows="2"
          />
          <PlanningSectionCard
            title="约束"
            section-key="analysis-constraints"
            :content="analysisSections['约束']?.content || ''"
            :loading="shouldShowSectionSkeleton('analysis-constraints')"
            :rows="2"
          />
          <PlanningSectionCard
            title="禁止项"
            section-key="analysis-prohibitions"
            :content="analysisSections['禁止项']?.content || ''"
            :loading="shouldShowSectionSkeleton('analysis-prohibitions')"
            :rows="2"
          />
          <PlanningSectionCard
            title="待补充信息"
            section-key="analysis-missing-info"
            :content="analysisSections['待补充信息']?.content || ''"
            :loading="shouldShowSectionSkeleton('analysis-missing-info')"
            :rows="2"
          />
          <PlanningSectionCard
            title="成熟度信号"
            section-key="analysis-readiness-signals"
            :content="analysisSections['成熟度信号']?.content || ''"
            :loading="shouldShowSectionSkeleton('analysis-readiness-signals')"
            :rows="2"
          />
        </div>
      </section>

      <section class="rounded-xl border border-emerald-200 bg-emerald-50/65 p-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
              设计交接
            </div>
            <div class="mt-1 text-[11px] text-emerald-700/80">后续蓝图编排直接消费这份交接文档</div>
          </div>
          <span :class="getRootBadgeClass('design')">{{ getRootStatusLabel('design') }}</span>
        </div>

        <div class="mt-3 space-y-3">
          <PlanningSectionCard
            title="候选节点"
            section-key="design-candidate-nodes"
            :content="designSections['候选节点']?.content || ''"
            :loading="shouldShowSectionSkeleton('design-candidate-nodes')"
            :rows="3"
          />
          <PlanningSectionCard
            title="输入要求"
            section-key="design-input-requirements"
            :content="designSections['输入要求']?.content || ''"
            :loading="shouldShowSectionSkeleton('design-input-requirements')"
            :rows="2"
          />
          <PlanningSectionCard
            title="输出要求"
            section-key="design-output-requirements"
            :content="designSections['输出要求']?.content || ''"
            :loading="shouldShowSectionSkeleton('design-output-requirements')"
            :rows="2"
          />
          <PlanningSectionCard
            title="待确认问题"
            section-key="design-confirmation-questions"
            :content="designSections['待确认问题']?.content || ''"
            :loading="shouldShowSectionSkeleton('design-confirmation-questions')"
            :rows="2"
          />
          <PlanningSectionCard
            title="蓝图要求"
            section-key="design-blueprint-requirements"
            :content="designSections['蓝图要求']?.content || ''"
            :loading="shouldShowSectionSkeleton('design-blueprint-requirements')"
            :rows="2"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h } from 'vue'
import type {
  GenerationPlanningBlockPayload,
  GenerationPlanningStreamSectionKey
} from '@preload/types'
import {
  getPlanningActiveRootSection,
  parsePlanningMarkdownSections,
  type GeneratePlanningMarkdownSection as PlanningMarkdownSectionData
} from '@renderer/stores/orchestraflow/generation-editor/generation-editor.types'
import FieldSkeleton from './GeneratePlanningBlockFieldSkeleton.vue'
import GeneratePlanningMarkdownSection from './GeneratePlanningMarkdownSection.vue'

const props = defineProps<{
  block: GenerationPlanningBlockPayload
}>()

const PlanningSectionCard = defineComponent({
  name: 'PlanningSectionCard',
  props: {
    title: {
      type: String,
      required: true
    },
    sectionKey: {
      type: String as () => GenerationPlanningStreamSectionKey,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    loading: {
      type: Boolean,
      required: true
    },
    rows: {
      type: Number,
      default: 2
    }
  },
  setup(cardProps) {
    return () =>
      h('section', { class: 'rounded-lg border border-white/70 bg-white/85 p-3' }, [
        h(
          'div',
          { class: 'text-[11px] font-semibold uppercase tracking-wide text-gray-500' },
          cardProps.title
        ),
        cardProps.loading
          ? h(FieldSkeleton, { rows: cardProps.rows })
          : cardProps.content.trim()
            ? h(GeneratePlanningMarkdownSection, { content: cardProps.content })
            : h('div', { class: 'mt-2 text-[12px] text-gray-400' }, '暂无')
      ])
  }
})

const analysisSections = computed<Record<string, PlanningMarkdownSectionData>>(() => {
  return parsePlanningMarkdownSections(props.block.analysisMarkdown || '')
})

const designSections = computed<Record<string, PlanningMarkdownSectionData>>(() => {
  return parsePlanningMarkdownSections(props.block.designMarkdown || '')
})

const summaryText = computed(() => {
  return (
    analysisSections.value['摘要']?.content
      .split('\n')
      .map((line) => line.trim().replace(/^-\s*/, ''))
      .filter(Boolean)
      .join(' ') || '正在整理本轮规划摘要...'
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
    return getPlanningActiveRootSection(props.block.streamingState.activeSection) === 'analysis'
      ? '正在生成需求分析块'
      : '正在生成设计交接块'
  }
  return props.block.status === 'ready' ? '可以交给蓝图阶段' : '仍建议继续澄清'
})

const statusDescription = computed(() => {
  if (props.block.streamingState?.isStreaming) {
    return '当前会先挂出两个 message block 骨架，再随着 markdown 标题逐个填入内容。'
  }
  if (props.block.status === 'ready') {
    return '当前规划已经满足 requirement handoff 的基本条件。'
  }
  return '当前规划已经有方向，但还存在待确认缺口，适合继续追问后再定稿。'
})

function shouldShowSectionSkeleton(sectionKey: GenerationPlanningStreamSectionKey): boolean {
  if (!props.block.streamingState?.isStreaming) {
    return false
  }
  return !props.block.streamingState.completedSectionKeys.includes(sectionKey)
}

function getRootStatusLabel(root: 'analysis' | 'design'): string {
  const streamingState = props.block.streamingState
  if (!streamingState?.isStreaming) {
    return props.block.status === 'ready' ? '已完成' : '待确认'
  }

  if (getPlanningActiveRootSection(streamingState.activeSection) === root) {
    return '生成中'
  }

  const allDone = streamingState.completedSectionKeys.filter(
    (key) => getPlanningActiveRootSection(key) === root
  ).length

  return allDone > 0 ? '已加载' : '等待中'
}

function getRootBadgeClass(root: 'analysis' | 'design'): string {
  const label = getRootStatusLabel(root)
  if (label === '生成中') {
    return 'rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700'
  }
  if (label === '已加载' || label === '已完成') {
    return 'rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700'
  }
  return 'rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500'
}
</script>
