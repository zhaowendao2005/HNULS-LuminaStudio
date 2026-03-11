<template>
  <div class="of-main-view flex h-full w-full flex-col">
    <GridView
      v-if="viewMode === 'grid'"
      @open-workflow="handleOpenWorkflow"
      @open-generate="handleOpenGenerate"
    />

    <GenerateView v-else-if="viewMode === 'generate'" />

    <EditorView
      v-else-if="viewMode === 'editor'"
      :workflow-id="currentWorkflowId"
      @back="handleBack"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import GridView from './GridView/index.vue'
import EditorView from './EditorView/index.vue'
import GenerateView from './GenerateView/index.vue'

const props = withDefaults(
  defineProps<{
    resetToken?: number
  }>(),
  {
    resetToken: 0
  }
)

const viewMode = ref<'grid' | 'generate' | 'editor'>('grid')
const currentWorkflowId = ref<string | null>(null)

function resetToGrid() {
  viewMode.value = 'grid'
  currentWorkflowId.value = null
}

function handleOpenWorkflow(workflowId: string) {
  currentWorkflowId.value = workflowId
  viewMode.value = 'editor'
}

function handleOpenGenerate() {
  currentWorkflowId.value = null
  viewMode.value = 'generate'
}

function handleBack() {
  resetToGrid()
}

watch(
  () => props.resetToken,
  () => {
    resetToGrid()
  }
)
</script>
