<template>
  <section class="of-mechanism-hint-card space-y-2">
    <button
      v-if="collapsible"
      type="button"
      class="flex w-full items-center gap-1.5 border-y border-gray-200 py-1 text-left text-sm text-gray-700 transition hover:text-gray-900"
      @click="collapsed = !collapsed"
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        class="h-3.5 w-3.5 shrink-0 text-gray-500 transition-transform"
        :class="collapsed ? '-rotate-90' : 'rotate-0'"
      >
        <path
          d="M5 7.5L10 12.5L15 7.5"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span class="font-medium">{{ title }}</span>
    </button>

    <div v-if="!collapsible" class="space-y-1">
      <div class="text-sm font-semibold text-gray-800">{{ title }}</div>
      <div v-if="description" class="text-xs leading-5 text-gray-400">
        {{ description }}
      </div>
    </div>

    <div v-if="!collapsed" class="space-y-2">
      <div v-if="collapsible && description" class="text-xs leading-5 text-gray-400">
        {{ description }}
      </div>

      <!-- 这里把 mechanism 的主规则单独放在第一层，方便用户先看到最关键的限制。 -->
      <div
        v-if="primaryRules.length"
        class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600"
      >
        <div v-for="rule in primaryRules" :key="rule">
          {{ rule }}
        </div>
      </div>

      <!-- 第二层规则用于补充说明，避免所有规则都堆在一个框里显得过重。 -->
      <div
        v-if="secondaryRules.length"
        class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600"
      >
        <div v-for="rule in secondaryRules" :key="rule">
          {{ rule }}
        </div>
      </div>

      <div
        v-if="notes.length"
        class="rounded-xl border border-dashed border-cyan-200 bg-cyan-50/60 px-3 py-2 text-xs leading-6 text-cyan-800"
      >
        <div v-for="note in notes" :key="note">
          {{ note }}
        </div>
        <div v-if="example">示例：{{ example }}</div>
      </div>

      <div
        v-if="warning"
        class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-800"
      >
        {{ warning }}
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    primaryRules?: string[]
    secondaryRules?: string[]
    notes?: string[]
    example?: string
    warning?: string
    collapsible?: boolean
    defaultCollapsed?: boolean
  }>(),
  {
    description: '',
    primaryRules: () => [],
    secondaryRules: () => [],
    notes: () => [],
    example: '',
    warning: '',
    collapsible: true,
    defaultCollapsed: true
  }
)

const collapsed = ref(props.collapsible ? props.defaultCollapsed : false)
</script>
