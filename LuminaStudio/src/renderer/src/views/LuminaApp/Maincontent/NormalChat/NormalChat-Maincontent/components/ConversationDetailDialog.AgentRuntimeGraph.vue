<template>
  <div class="flex h-full min-h-0 overflow-hidden bg-white">
    <div
      class="relative min-w-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_28%),radial-gradient(circle_at_82%_14%,_rgba(139,92,246,0.12),_transparent_24%),linear-gradient(180deg,_#fcfeff_0%,_#f3f7fb_100%)]"
    >
      <VueFlow
        :nodes="runtimeNodes"
        :edges="runtimeEdges"
        :default-viewport="defaultViewport"
        :nodes-draggable="false"
        :nodes-connectable="false"
        :elements-selectable="false"
        :edges-updatable="false"
        :delete-key-code="null"
        :min-zoom="0.42"
        :max-zoom="1.4"
        :zoom-on-scroll="true"
        :zoom-on-double-click="false"
        :pan-on-drag="true"
        :prevent-scrolling="true"
        :only-render-visible-elements="true"
        :translate-extent="translateExtent"
        class="nc-runtime-flow h-full w-full"
        @node-click="handleNodeClick"
        @pane-ready="handlePaneReady"
      >
        <template #node-runtime="nodeProps">
          <ConversationDetailDialogRuntimeFlowNode
            :id="nodeProps.id"
            :data="nodeProps.data"
            :selected="nodeProps.data.isSelected"
          />
        </template>
        <template #edge-runtime="edgeProps">
          <ConversationDetailDialogRuntimeFlowEdge v-bind="edgeProps" />
        </template>
        <Background
          v-if="showBackground"
          variant="dots"
          :gap="20"
          :size="1"
          pattern-color="#d7e1e8"
        />
      </VueFlow>

      <div class="pointer-events-none absolute left-6 top-5">
        <div
          class="rounded-full border border-white/80 bg-white/90 px-4 py-2 text-[12px] text-[#526673] shadow-[0_12px_32px_rgba(15,23,42,0.08)] backdrop-blur"
        >
          拖动画布浏览链路，滚轮缩放，点击节点后再展开右侧详情。
        </div>
      </div>

      <div class="pointer-events-none absolute right-6 top-5 w-[272px]">
        <div
          class="rounded-[28px] border border-white/80 bg-white/92 px-5 py-5 shadow-[0_18px_48px_rgba(15,23,42,0.1)] backdrop-blur"
        >
          <div class="flex items-center justify-between gap-3">
            <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#72879a]">
              Runtime Legend
            </p>
            <span
              class="rounded-full bg-[#eef4f8] px-2.5 py-1 text-[10px] font-semibold text-[#607381]"
            >
              Vue Flow
            </span>
          </div>

          <div class="mt-4 space-y-2.5 text-[12px] text-[#445866]">
            <div class="flex items-center justify-between gap-3 rounded-2xl bg-[#f7fafc] px-3 py-2">
              <div class="flex items-center gap-3">
                <span class="h-3.5 w-3.5 rounded-full bg-[#94a3b8]" />
                <span>用户问题</span>
              </div>
              <span class="text-[11px] text-[#7b8a97]">入口</span>
            </div>
            <div class="flex items-center justify-between gap-3 rounded-2xl bg-[#f7fafc] px-3 py-2">
              <div class="flex items-center gap-3">
                <span class="h-3.5 w-3.5 rounded-full bg-[#0ea5e9]" />
                <span>LLM 调用</span>
              </div>
              <span class="text-[11px] text-[#7b8a97]">推理</span>
            </div>
            <div class="flex items-center justify-between gap-3 rounded-2xl bg-[#f7fafc] px-3 py-2">
              <div class="flex items-center gap-3">
                <span class="h-3.5 w-3.5 rounded-full bg-[#14b8a6]" />
                <span>Functioncall</span>
              </div>
              <span class="text-[11px] text-[#7b8a97]">工具</span>
            </div>
            <div class="flex items-center justify-between gap-3 rounded-2xl bg-[#f7fafc] px-3 py-2">
              <div class="flex items-center gap-3">
                <span class="h-3.5 w-3.5 rounded-full bg-[#6366f1]" />
                <span>System Action</span>
              </div>
              <span class="text-[11px] text-[#7b8a97]">控制</span>
            </div>
            <div class="flex items-center justify-between gap-3 rounded-2xl bg-[#f7fafc] px-3 py-2">
              <div class="flex items-center gap-3">
                <span class="h-3.5 w-3.5 rounded-full bg-[#8b5cf6]" />
                <span>Subagent 分支</span>
              </div>
              <span class="text-[11px] text-[#7b8a97]">分流</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Background } from '@vue-flow/background'
import { Position, VueFlow, useVueFlow, type Edge, type Node } from '@vue-flow/core'
import type { ChatDetailRuntimeGraph } from '@renderer/stores/normal-chat/chat-detail-shell/chat-detail-shell.types'
import ConversationDetailDialogRuntimeFlowEdge from './ConversationDetailDialog.RuntimeFlowEdge.vue'
import ConversationDetailDialogRuntimeFlowNode from './ConversationDetailDialog.RuntimeFlowNode.vue'
import '@vue-flow/core/dist/style.css'

const props = defineProps<{
  graph: ChatDetailRuntimeGraph | null
  selectedNodeId: string
}>()

const emit = defineEmits<{
  'select-node': [nodeId: string]
}>()

const defaultViewport = {
  x: 0,
  y: 0,
  zoom: 0.8
}

const EDGE_LABEL_THRESHOLD = 28
const BACKGROUND_THRESHOLD = 48

const currentGraphKey = computed(() => {
  return props.graph?.nodes.find((node) => node.kind === 'user-query')?.id ?? ''
})

const runtimeNodes = computed<Node[]>(() => {
  return (props.graph?.nodes ?? []).map((node) => ({
    id: node.id,
    type: 'runtime',
    position: { x: node.x, y: node.y },
    draggable: false,
    selectable: false,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: {
      ...node,
      isSelected: node.id === props.selectedNodeId
    },
    width: node.width,
    height: node.height,
    style: {
      width: `${node.width}px`,
      height: `${node.height}px`,
      background: 'transparent',
      border: 'none',
      padding: '0'
    }
  }))
})

const runtimeEdges = computed<Edge[]>(() => {
  const edgeCount = props.graph?.edges.length ?? 0

  return (props.graph?.edges ?? []).map((edge) => ({
    id: edge.id,
    type: 'runtime',
    source: edge.source,
    target: edge.target,
    sourceHandle: 'out',
    targetHandle: 'in',
    selectable: false,
    focusable: false,
    data: {
      label: edge.label,
      stroke: edge.stroke,
      dashed: edge.dashed,
      showLabel:
        edgeCount <= EDGE_LABEL_THRESHOLD &&
        ['subagent', '分支回流', '状态汇总'].includes(edge.label)
    }
  }))
})

const hasFitted = ref(false)
const { fitView } = useVueFlow()

const showBackground = computed(() => (props.graph?.nodes.length ?? 0) <= BACKGROUND_THRESHOLD)

const translateExtent = computed(() => {
  const width = props.graph?.canvasWidth ?? 2400
  const height = props.graph?.canvasHeight ?? 1600
  return [
    [-width * 0.18, -height * 0.18],
    [width * 1.18, height * 1.18]
  ] as [[number, number], [number, number]]
})

async function fitRuntimeGraph(): Promise<void> {
  if (!props.graph || props.graph.nodes.length === 0 || hasFitted.value) {
    return
  }

  await nextTick()
  fitView({ padding: 0.18, duration: 0 })
  hasFitted.value = true
}

function handlePaneReady(): void {
  void fitRuntimeGraph()
}

function handleNodeClick(event: { node: Node }): void {
  emit('select-node', event.node.id)
}

watch(
  () => currentGraphKey.value,
  () => {
    hasFitted.value = false
    void fitRuntimeGraph()
  },
  { immediate: true }
)
</script>

<style scoped>
.nc-runtime-flow :deep(.vue-flow__pane) {
  cursor: grab;
}

.nc-runtime-flow :deep(.vue-flow__node) {
  background: transparent;
  border: none;
  padding: 0;
}

.nc-runtime-flow :deep(.vue-flow__node.selected) {
  box-shadow: none;
}

.nc-runtime-flow :deep(.vue-flow__edge-path) {
  pointer-events: none;
}

.nc-runtime-flow :deep(.vue-flow__handle) {
  pointer-events: none;
}
</style>
