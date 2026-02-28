<template>
  <div class="of-main-view h-full w-full flex flex-col">
    <!-- Grid 视图：工作流列表页 -->
    <GridView v-if="viewMode === 'grid'" @open-workflow="handleOpenWorkflow" />
    
    <!-- Editor 视图：工作流编辑器 -->
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

// 视图模式：grid（列表）或 editor（编辑器）
const viewMode = ref<'grid' | 'editor'>('grid')
const currentWorkflowId = ref<string | null>(null)

function handleOpenWorkflow(workflowId: string) {
  currentWorkflowId.value = workflowId
  viewMode.value = 'editor'
}

function handleBack() {
  viewMode.value = 'grid'
  currentWorkflowId.value = null
}
</script>
