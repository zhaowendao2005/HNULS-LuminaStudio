<template>
  <div class="nc_NormalChat_DevPage_a8d3 flex-1 overflow-y-auto px-4 py-4">
    <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-slate-700">ChatFlow Dev</p>
          <p class="mt-2 text-xs leading-6 text-slate-500">
            这里的按钮不会走后端执行器，而是直接复用当前前端消息流做固定回放。
          </p>
        </div>
        <span class="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500">
          Frontend Mock
        </span>
      </div>

      <p
        class="mt-3 rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2 text-[12px] leading-6 text-slate-500"
      >
        {{ statusText }}
      </p>

      <div class="mt-4 grid grid-cols-2 gap-3">
        <article
          v-for="scenario in scenarios"
          :key="scenario.id"
          class="rounded-2xl border px-3 py-3 shadow-sm transition-shadow hover:shadow-md"
          :class="scenario.accentClass"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="truncate text-[13px] font-semibold text-slate-800">
                {{ scenario.title }}
              </p>
              <p class="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {{ scenario.badge }}
              </p>
            </div>

            <button
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/80 bg-white/80 text-slate-500 transition-colors hover:border-slate-200 hover:text-slate-700"
              type="button"
              title="查看场景详情"
              @click="activeScenarioId = scenario.id"
            >
              <svg
                class="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 10v5" />
                <circle cx="12" cy="7.5" r="0.8" fill="currentColor" stroke="none" />
              </svg>
            </button>
          </div>

          <button
            class="mt-3 flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            :class="
              runningScenarioId === scenario.id
                ? 'border-slate-300 bg-slate-900 text-white'
                : 'border-white/80 hover:border-slate-200 hover:bg-white'
            "
            :disabled="!canRunScenario"
            type="button"
            @click="void runScenario(scenario.id)"
          >
            <span
              class="flex h-7 w-7 items-center justify-center rounded-lg"
              :class="runningScenarioId === scenario.id ? 'bg-white/15' : 'bg-slate-100'"
            >
              <svg
                class="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path v-if="runningScenarioId === scenario.id" d="M8 8h8v8H8z" />
                <path v-else d="M8 6l10 6-10 6V6z" />
              </svg>
            </span>
            {{ runningScenarioId === scenario.id ? '回放中…' : '运行测试' }}
          </button>
        </article>
      </div>
    </div>

    <CenteredDialog
      v-model="detailDialogOpen"
      title="场景详情"
      :subtitle="activeScenario?.title ?? '固定测试场景'"
      max-width="560px"
    >
      <div v-if="activeScenario" class="space-y-4">
        <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            场景说明
          </p>
          <p class="mt-2 text-[13px] leading-7 text-slate-600">
            {{ activeScenario.description }}
          </p>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            固定输入
          </p>
          <p class="mt-2 whitespace-pre-wrap text-[13px] leading-7 text-slate-700">
            {{ activeScenario.input }}
          </p>
        </div>
      </div>
    </CenteredDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import CenteredDialog from '@renderer/views/LuminaApp/Maincontent/OrchestraFlowView/EditorView/Common/CenteredDialog.vue'
import { useChatflowDev } from '../composables/chatflow-dev/useChatflowDev'

const { scenarios, runningScenarioId, canRunScenario, statusText, runScenario } = useChatflowDev()
const activeScenarioId = ref('')

const activeScenario = computed(() => {
  return scenarios.find((scenario) => scenario.id === activeScenarioId.value) ?? null
})

const detailDialogOpen = computed({
  get() {
    return Boolean(activeScenarioId.value)
  },
  set(value: boolean) {
    if (!value) {
      activeScenarioId.value = ''
    }
  }
})
</script>
