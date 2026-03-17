<template>
  <aside
    :class="[
      'of-generate-sidebar z-10 flex shrink-0 flex-col border-r border-gray-200 bg-white transition-all duration-300 ease-in-out',
      collapsed ? 'w-14' : 'w-56'
    ]"
  >
    <div class="flex-1 overflow-y-auto py-3">
      <div v-for="section in sections" :key="section.title" class="mb-5 last:mb-0">
        <div
          v-if="!collapsed"
          class="mb-1.5 px-4 text-[10px] font-semibold uppercase tracking-wider text-gray-400"
        >
          {{ section.title }}
        </div>
        <nav class="flex flex-col gap-0.5 px-2">
          <button
            v-for="item in section.items"
            :key="item.value"
            type="button"
            :title="collapsed ? item.label : undefined"
            :class="[
              'group relative flex w-full items-center gap-2 px-2 py-1.5 transition-colors',
              collapsed ? 'justify-center' : 'justify-start',
              activeMenu === item.value
                ? 'text-gray-900'
                : 'text-gray-500 hover:bg-gray-50/50 hover:text-gray-800'
            ]"
            @click="$emit('change-menu', item.value)"
          >
            <span
              v-if="activeMenu === item.value"
              class="absolute bottom-1 left-0 top-1 w-0.5 rounded-r-sm bg-gray-800"
            ></span>
            <component
              :is="item.icon"
              :size="16"
              :class="
                activeMenu === item.value
                  ? 'text-gray-800'
                  : 'text-gray-400 group-hover:text-gray-600'
              "
            />
            <span v-if="!collapsed" class="whitespace-nowrap text-[12px] font-medium">
              {{ item.label }}
            </span>
          </button>
        </nav>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MenuItem } from './generate-view.types'

const props = defineProps<{
  collapsed: boolean
  activeMenu: MenuItem['value']
  basicMenus: MenuItem[]
  workflowMenus: MenuItem[]
  configMenus: MenuItem[]
}>()

defineEmits<{
  (e: 'change-menu', value: MenuItem['value']): void
}>()

const sections = computed(() => {
  return [
    { title: '基础功能', items: props.basicMenus },
    { title: '工作流生成', items: props.workflowMenus },
    { title: '配置', items: props.configMenus }
  ]
})
</script>
