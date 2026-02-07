<template>
  <section
    class="nc_NormalChat_RightPanel_a8d3 flex-shrink-0 bg-white border border-slate-200 rounded-2xl overflow-hidden transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col"
    :style="{ width: collapsed ? '64px' : '320px' }"
  >
    <div
      class="nc_NormalChat_RightHeader_a8d3 flex items-center border-b border-slate-100"
      :class="collapsed ? 'justify-center px-2 py-3' : 'justify-between px-4 py-3'"
    >
      <div v-if="!collapsed" class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-blue-500"></div>
        <WhiteSelect
          v-model="currentPage"
          :options="pageOptions"
          style="min-width: 100px"
          @change="handlePageChange"
        />
      </div>
      <button
        class="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition-colors flex items-center justify-center"
        @click="$emit('update:collapsed', !collapsed)"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path v-if="collapsed" d="M15 6l-6 6 6 6" />
          <path v-else d="M9 6l6 6-6 6" />
        </svg>
      </button>
    </div>

    <div
      v-if="!collapsed"
      class="nc_NormalChat_RightContent_a8d3 flex-1 overflow-hidden flex flex-col"
    >
      <StudioPage v-if="currentPage === 'studio'" :tools="tools" :notes="notes" />
      <DevPage v-else-if="currentPage === 'dev'" />
    </div>
    <div v-else class="nc_NormalChat_RightCollapsed_a8d3 flex-1" />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import WhiteSelect from '../components/WhiteSelect.vue'
import StudioPage from './StudioPage.vue'
import DevPage from './DevPage.vue'

defineProps<{
  collapsed: boolean
  tools: any[]
  notes: any[]
}>()

defineEmits<{
  (e: 'update:collapsed', value: boolean): void
}>()

const currentPage = ref('studio')
const pageOptions = [
  { label: 'Studio', value: 'studio' },
  { label: 'Dev', value: 'dev' }
]

const handlePageChange = (value: string | number | null) => {
  currentPage.value = String(value ?? 'studio')
}
</script>
