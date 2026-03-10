<template>
  <div
    class="of-generator-view relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.14),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef6ff_100%)]"
  >
    <div class="mx-auto flex h-full max-w-[1600px] gap-4 px-4 py-4 lg:px-6">
      <aside class="w-full max-w-[320px] shrink-0 space-y-4">
        <button
          type="button"
          class="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
          @click="$emit('back')"
        >
          Back to Grid
        </button>
        <PromptTimelinePanel
          v-model="draftPrompt"
          :checkpoints="session?.checkpoints || []"
          @send="handleSendPrompt"
          @rollback="handleRollback"
        />
      </aside>

      <main class="min-w-0 flex-1 space-y-4">
        <PhaseHeader :current-phase="session?.current_phase || 'plan'" @advance="handleAdvance" />
        <div class="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <PlanPreviewPanel :items="session?.preview.plan || []" />
          <TopologyPreviewPanel :lines="session?.preview.topology_text || []" />
        </div>
      </main>

      <aside class="w-full max-w-[360px] shrink-0 space-y-4">
        <InspectorPanel :summary="session?.preview.summary || emptySummary" />
        <ModelConfigPanel
          :models="phaseModels"
          @update:model="handleUpdateModel"
          @save="handleSaveModels"
        />
        <ValidationReportPanel :report="session?.validation || emptyValidation" />
        <button
          type="button"
          :disabled="!session?.validation.ok"
          class="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:bg-slate-300"
          :class="session?.validation.ok ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-300'"
          @click="handleConfirm"
        >
          Confirm and Open Editor
        </button>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type {
  OFGenerationGraphSummary,
  OFGenerationPhase,
  OFGenerationPhaseModelConfig,
  OFGenerationValidationReport
} from '@shared/Orchestraflow-types'
import { useWorkflowGenerationStore } from '@renderer/stores/orchestraflow/workflow-generation/workflow-generation.store'
import PromptTimelinePanel from './PromptTimelinePanel.vue'
import PhaseHeader from './PhaseHeader.vue'
import TopologyPreviewPanel from './TopologyPreviewPanel.vue'
import InspectorPanel from './InspectorPanel.vue'
import PlanPreviewPanel from './PlanPreviewPanel.vue'
import ValidationReportPanel from './ValidationReportPanel.vue'
import ModelConfigPanel from './ModelConfigPanel.vue'

const props = defineProps<{
  sessionId: string | null
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'open-workflow', workflowId: string): void
}>()

const store = useWorkflowGenerationStore()
const draftPrompt = ref('')
const phaseModels = ref<Record<OFGenerationPhase, OFGenerationPhaseModelConfig>>({
  plan: { phase: 'plan', enabled: true },
  wire: { phase: 'wire', enabled: true },
  config: { phase: 'config', enabled: true },
  validate: { phase: 'validate', enabled: true }
})

const session = computed(() => store.currentSession)
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

watch(
  () => session.value,
  (value) => {
    draftPrompt.value = value?.prompt || ''
    if (value?.phase_models) {
      phaseModels.value = structuredClone(value.phase_models)
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

function handleUpdateModel(phase: OFGenerationPhase, value: string) {
  phaseModels.value = {
    ...phaseModels.value,
    [phase]: {
      ...phaseModels.value[phase],
      phase,
      model: value
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
</script>
