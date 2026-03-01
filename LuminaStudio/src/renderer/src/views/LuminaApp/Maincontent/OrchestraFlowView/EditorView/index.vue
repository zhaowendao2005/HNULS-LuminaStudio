<template>
  <div class="of-editor h-full w-full flex flex-col relative">
    <!-- 整个编辑器布局都交给 PanelLayer，内部负责 Header + 主内容 + 左侧栏等 -->
    <PanelLayer :workflow-id="props.workflowId" />
  </div>
</template>

<script setup lang="ts">
import PanelLayer from './PanelLayer/index.vue'

const props = defineProps<{
  workflowId: string | null
}>()

defineEmits<{
  (e: 'back'): void
}>()
</script>
