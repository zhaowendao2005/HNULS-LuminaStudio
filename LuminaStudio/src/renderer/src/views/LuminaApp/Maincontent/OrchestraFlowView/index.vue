<template>
  <div class="of-main-view h-full w-full flex flex-col">
    <GridView
      v-if="viewMode === 'grid'"
      @open-workflow="handleOpenWorkflow"
      @open-generator="handleOpenGenerator"
    />
    <GeneratorView
      v-else-if="viewMode === 'generator'"
      :session-id="currentSessionId"
      @back="handleBack"
      @switch-session="handleOpenGenerator"
      @open-workflow="handleOpenWorkflow"
    />
    <EditorView
      v-else-if="viewMode === 'editor'"
      :workflow-id="currentWorkflowId"
      @back="handleBack"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import GridView from './GridView/index.vue'
import EditorView from './EditorView/index.vue'
import GeneratorView from './GeneratorView/index.vue'

const viewMode = ref<'grid' | 'generator' | 'editor'>('grid')
const currentWorkflowId = ref<string | null>(null)
const currentSessionId = ref<string | null>(null)

function handleOpenWorkflow(workflowId: string) {
  currentWorkflowId.value = workflowId
  currentSessionId.value = null
  viewMode.value = 'editor'
}

function handleOpenGenerator(sessionId: string) {
  currentSessionId.value = sessionId
  currentWorkflowId.value = null
  viewMode.value = 'generator'
}

function handleBack() {
  viewMode.value = 'grid'
  currentWorkflowId.value = null
  currentSessionId.value = null
}
</script>
