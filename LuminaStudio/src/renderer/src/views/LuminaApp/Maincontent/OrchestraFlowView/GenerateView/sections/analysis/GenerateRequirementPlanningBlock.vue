<template>
  <div class="of-generate-requirement-planning mt-1 rounded-xl border border-cyan-200 bg-cyan-50/70 p-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <span
            class="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-semibold text-cyan-700"
          >
            需求规划输出
          </span>
          <span class="rounded-full bg-white px-2 py-0.5 text-[10px] text-gray-500">
            协议：Markdown
          </span>
        </div>

        <div class="mt-3 text-[13px] font-semibold leading-6 text-gray-800">
          {{ block.summaryText }}
        </div>
      </div>
    </div>

    <div class="mt-4 grid gap-3 md:grid-cols-2">
      <section
        v-for="title in sectionTitles"
        :key="title"
        class="rounded-lg border border-white/80 bg-white/90 p-3"
      >
        <div class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          {{ title }}
        </div>
        <div class="mt-2">
          <GenerateRequirementPlanningMarkdownSection :content="block.sections[title].content" />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { REQUIREMENT_PLANNING_SECTION_TITLES } from '@renderer/stores/orchestraflow/generation-editor/generation-editor.types'
import type {
  RequirementPlanningBlockViewModel,
  RequirementPlanningSectionTitle
} from '@renderer/stores/orchestraflow/generation-editor/generation-editor.types'
import GenerateRequirementPlanningMarkdownSection from './GenerateRequirementPlanningMarkdownSection.vue'

defineProps<{
  block: RequirementPlanningBlockViewModel
}>()

// 用固定顺序渲染 4 个核心标题，保证用户每次看到的布局稳定一致。
const sectionTitles = REQUIREMENT_PLANNING_SECTION_TITLES as readonly RequirementPlanningSectionTitle[]
</script>
