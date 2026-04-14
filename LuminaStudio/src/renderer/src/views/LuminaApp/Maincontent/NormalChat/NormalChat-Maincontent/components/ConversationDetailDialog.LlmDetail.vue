<template>
  <section
    class="flex h-full min-h-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
  >
    <div class="flex h-full w-[340px] shrink-0 flex-col border-r border-gray-200 bg-white">
      <div class="border-b border-gray-200 bg-gray-50/50 px-3 py-3">
        <h2 class="text-xs font-bold uppercase tracking-wider text-gray-500">Debug Explorer</h2>
      </div>

      <div class="flex-1 overflow-y-auto py-2">
        <div
          v-for="group in flatGroups"
          :key="group.id"
          class="mb-2 border-b border-gray-100 pb-2 last:mb-0 last:border-b-0"
        >
          <button
            class="flex w-full items-center justify-between px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider transition-colors"
            :class="
              selectedGroupId === group.id ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
            "
            type="button"
            @click="emit('scroll-to-doc', group.firstLeafId ?? '', group.id)"
          >
            <span>{{ group.title }}</span>
            <span class="rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
              {{ group.leafCount }}
            </span>
          </button>

          <ul class="mt-1 px-2">
            <li v-for="node in group.nodes" :key="node.id">
              <button
                class="flex w-full items-start rounded-lg px-2 py-2 text-left transition-colors"
                :class="getNodeClass(node, group.id)"
                type="button"
                @click="handleTreeNodeClick(node, group.id)"
              >
                <div class="min-w-0" :style="{ paddingLeft: `${node.depth * 12}px` }">
                  <div class="truncate text-[12px] font-medium">
                    <span v-if="node.kind === 'branch'">▸</span>
                    <span v-else>•</span>
                    {{ node.title }}
                  </div>
                  <div class="mt-0.5 truncate text-[11px] text-gray-500">{{ node.summary }}</div>
                </div>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div
      :ref="(el) => emit('set-content-ref', el as HTMLElement | null)"
      class="min-h-0 flex-1 overflow-y-auto bg-[#f8f9fa] p-6 md:p-8"
    >
      <div class="mx-auto max-w-5xl space-y-8 pb-24">
        <template v-for="group in flatGroups" :key="group.id">
          <section
            :id="`group-${group.id}`"
            class="rounded-xl border border-dashed border-gray-200 bg-white/70 px-5 py-4"
          >
            <div class="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
              {{ group.title }}
            </div>
            <div class="mt-2 text-[12px] text-gray-500">共 {{ group.leafCount }} 个叶子节点</div>
          </section>

          <template v-for="node in group.nodes" :key="node.id">
            <section
              v-if="node.kind === 'branch'"
              :id="node.id"
              class="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-5 py-4"
            >
              <div class="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
                {{ node.title }}
              </div>
              <div class="mt-2 text-[12px] text-gray-500">{{ node.summary }}</div>
            </section>

            <section
              v-else
              :id="node.id"
              :ref="(el) => emit('register-doc-ref', node.id, el)"
              class="scroll-mt-24 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]"
            >
              <header
                class="flex items-center justify-between border-b border-gray-200 bg-[#fbfcfd] px-5 py-3"
              >
                <div>
                  <div class="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
                    {{ group.title }}
                  </div>
                  <div class="mt-1 flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <span>{{ node.title }}</span>
                    <span class="relative inline-flex">
                      <span
                        class="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 bg-white text-[10px] font-bold leading-none text-gray-500"
                        @mouseenter="emit('show-tooltip', node.id)"
                        @mouseleave="emit('hide-tooltip')"
                      >
                        i
                      </span>
                      <span
                        v-show="activeTooltipId === node.id"
                        :ref="(el) => emit('register-tooltip-ref', node.id, el)"
                        class="pointer-events-none absolute left-0 top-6 z-[120] inline-block min-w-[16rem] max-w-[28rem] whitespace-normal break-words rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-left text-[11px] font-normal leading-5 text-white shadow-xl"
                        :style="getTooltipStyle(node.id)"
                      >
                        <span class="block text-white opacity-100">{{ node.doc.description }}</span>
                      </span>
                    </span>
                  </div>
                </div>
                <span
                  class="rounded bg-gray-100 px-2 py-1 text-[10px] uppercase tracking-wider text-gray-500"
                >
                  {{ node.doc.kind }}
                </span>
              </header>

              <div class="overflow-x-auto p-5">
                <template v-if="shouldMountDoc(node.id)">
                  <StructuredCodeViewer
                    v-if="node.doc.kind === 'json-object'"
                    :payload="node.doc.payload"
                    :mode="getDocViewMode(node.doc)"
                  />
                  <div
                    v-else-if="shouldRenderMarkdown(node.doc)"
                    class="rounded-2xl bg-white px-1 py-1"
                  >
                    <MarkdownJsonContent :content="formatTextPayload(node.doc)" />
                  </div>
                  <pre
                    v-else
                    class="m-0 whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-gray-800"
                  ><code>{{ formatTextPayload(node.doc) }}</code></pre>
                </template>
                <div
                  v-else
                  class="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-[12px] text-gray-400"
                >
                  <div class="animate-pulse space-y-2">
                    <div class="h-3 w-40 rounded bg-gray-200" />
                    <div class="h-3 w-72 rounded bg-gray-200" />
                    <div class="h-3 w-56 rounded bg-gray-200" />
                  </div>
                </div>
              </div>
            </section>
          </template>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MarkdownJsonContent from './MarkdownJsonContent.vue'
import StructuredCodeViewer from './StructuredCodeViewer.vue'
import type {
  ChatDetailDataViewMode,
  ChatDetailShellDocGroup,
  ChatDetailShellDocGroupId,
  ChatDetailShellDocItem,
  ChatDetailShellDocTreeBranchNode,
  ChatDetailShellDocTreeLeafNode,
  ChatDetailShellDocTreeNode
} from '@renderer/stores/normal-chat/chat-detail-shell/chat-detail-shell.types'

type FlatDocNode =
  | (ChatDetailShellDocTreeLeafNode & {
      depth: number
      firstLeafId: string
    })
  | (ChatDetailShellDocTreeBranchNode & {
      depth: number
      firstLeafId: string | null
    })

type FlatGroup = {
  id: ChatDetailShellDocGroupId
  title: string
  nodes: FlatDocNode[]
  leafCount: number
  firstLeafId: string | null
}

const props = defineProps<{
  selectedGroups: ChatDetailShellDocGroup[]
  selectedGroupId: ChatDetailShellDocGroupId
  selectedDocId: string
  activeTooltipId: string
  getTooltipStyle: (docId: string) => Record<string, string>
  getDocViewMode: (doc: ChatDetailShellDocItem) => ChatDetailDataViewMode
  formatTextPayload: (doc: ChatDetailShellDocItem) => string
  shouldRenderMarkdown: (doc: ChatDetailShellDocItem) => boolean
  getDocItemClass: (docId: string, groupId: ChatDetailShellDocGroupId) => string
  mountedDocIds: string[]
}>()

const emit = defineEmits<{
  'scroll-to-doc': [docId: string, groupId: ChatDetailShellDocGroupId]
  'set-content-ref': [el: HTMLElement | null]
  'register-doc-ref': [docId: string, el: Element | { $el?: Element } | null]
  'register-tooltip-ref': [docId: string, el: Element | { $el?: Element } | null]
  'show-tooltip': [docId: string]
  'hide-tooltip': []
}>()

const mountedDocIdSet = computed(() => new Set(props.mountedDocIds))

function flattenTreeNodes(nodes: ChatDetailShellDocTreeNode[], depth = 0): FlatDocNode[] {
  const result: FlatDocNode[] = []

  for (const node of nodes) {
    if (node.kind === 'leaf') {
      result.push({ ...node, depth, firstLeafId: node.id })
      continue
    }

    const children = flattenTreeNodes(node.children, depth + 1)
    result.push({ ...node, depth, firstLeafId: children[0]?.firstLeafId ?? null })
    result.push(...children)
  }

  return result
}

function buildFlatGroup(group: ChatDetailShellDocGroup): FlatGroup {
  if (group.tree && group.tree.length > 0) {
    const nodes = flattenTreeNodes(group.tree)
    return {
      id: group.id,
      title: group.title,
      nodes,
      leafCount: nodes.filter((node) => node.kind === 'leaf').length,
      firstLeafId: nodes.find((node) => node.firstLeafId)?.firstLeafId ?? null
    }
  }

  const nodes: FlatDocNode[] = group.items.map((doc) => ({
    id: doc.id,
    kind: 'leaf',
    title: doc.title,
    summary: doc.summary,
    doc,
    depth: 0,
    firstLeafId: doc.id
  }))

  return {
    id: group.id,
    title: group.title,
    nodes,
    leafCount: nodes.length,
    firstLeafId: nodes[0]?.id ?? null
  }
}

const flatGroups = computed(() => props.selectedGroups.map((group) => buildFlatGroup(group)))

function shouldMountDoc(docId: string): boolean {
  return mountedDocIdSet.value.has(docId) || props.selectedDocId === docId
}

function getNodeClass(node: FlatDocNode, groupId: ChatDetailShellDocGroupId): string {
  if (node.kind === 'branch') {
    return 'text-gray-600 hover:bg-gray-50'
  }
  return props.getDocItemClass(node.id, groupId)
}

function handleTreeNodeClick(node: FlatDocNode, groupId: ChatDetailShellDocGroupId): void {
  if (node.kind === 'branch') {
    emit('scroll-to-doc', node.firstLeafId ?? '', groupId)
    return
  }

  emit('scroll-to-doc', node.id, groupId)
}
</script>
