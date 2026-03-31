<template>
  <div
    v-if="snapshot.visible"
    class="nc-conversation-detail-dialog-a9k2 fixed inset-0 z-[70] flex items-center justify-center bg-black/20 backdrop-blur-[1px]"
  >
    <div
      class="nc-conversation-detail-dialog-panel-a9k2 flex h-[760px] w-[1240px] overflow-hidden rounded-2xl bg-white shadow-[var(--nc-shadow-dialog)]"
    >
      <aside
        class="flex w-[76px] flex-col items-center gap-3 border-r border-gray-100 bg-white px-3 py-4"
      >
        <button
          class="flex h-10 w-10 items-center justify-center rounded-xl border transition-colors"
          :class="
            snapshot.currentPage === 'overview'
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700'
          "
          type="button"
          title="Overview"
          @click="detailShellStore.goToOverview"
        >
          <svg
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M4 6h16" />
            <path d="M4 12h16" />
            <path d="M4 18h16" />
            <circle cx="8" cy="6" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="16" cy="12" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="12" cy="18" r="1.2" fill="currentColor" stroke="none" />
          </svg>
        </button>

        <button
          class="mt-auto flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-600"
          type="button"
          title="Close"
          @click="detailShellStore.closeDialog"
        >
          <X class="h-4 w-4" />
        </button>
      </aside>

      <div class="min-w-0 flex-1 bg-[#f8f9fa]">
        <div class="flex h-full min-h-0 flex-col">
          <header class="border-b border-gray-200 bg-white px-6 py-4">
            <div v-if="snapshot.currentPage === 'overview'" class="min-w-0">
              <h2 class="truncate text-[16px] font-semibold text-gray-900">
                {{ dialogTitle }}
              </h2>
              <p class="mt-1 text-[12px] leading-5 text-gray-500">
                Each row is one primary LLM request-response pair for the current turn.
              </p>
            </div>

            <div v-else class="flex items-center gap-3">
              <button
                class="flex h-9 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-[13px] font-medium text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-900"
                type="button"
                @click="detailShellStore.goToOverview"
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
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                Back
              </button>

              <div class="min-w-0">
                <p class="truncate font-mono text-[11px] uppercase tracking-[0.14em] text-gray-400">
                  {{ breadcrumbText }}
                </p>
                <h2 class="truncate text-[16px] font-semibold text-gray-900">
                  {{ selectedCallItem?.title ?? 'LLM Call Detail' }}
                </h2>
              </div>
            </div>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto p-6">
            <section v-if="snapshot.currentPage === 'overview'" class="space-y-3">
              <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <div
                  class="grid grid-cols-[64px_320px_220px_88px_88px_24px] items-center gap-3 border-b border-gray-100 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400"
                >
                  <span>No.</span>
                  <span>Call</span>
                  <span>Context</span>
                  <span>Type</span>
                  <span>Status</span>
                  <span></span>
                </div>

                <button
                  v-for="call in llmCallItems"
                  :key="call.id"
                  class="grid w-full grid-cols-[64px_320px_220px_88px_88px_24px] items-center gap-3 border-b border-gray-100 px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-gray-50"
                  type="button"
                  @click="detailShellStore.openCallDetail(call.id)"
                >
                  <span class="truncate text-[12px] font-medium text-gray-500">
                    {{ call.indexLabel }}
                  </span>
                  <div class="min-w-0">
                    <p class="truncate text-[12px] font-semibold text-gray-900">{{ call.title }}</p>
                    <p class="mt-0.5 truncate text-[11px] text-gray-500">{{ call.summary }}</p>
                  </div>
                  <p class="truncate text-[12px] text-gray-700">{{ call.contextText }}</p>
                  <span class="truncate text-[12px] text-gray-600">{{ call.badge }}</span>
                  <span
                    class="inline-flex max-w-full items-center truncate rounded-full px-2.5 py-1 text-[11px] font-medium"
                    :class="call.statusClass"
                  >
                    {{ call.statusLabel }}
                  </span>
                  <span class="flex items-center justify-end text-gray-300">
                    <svg
                      class="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </span>
                </button>
              </div>
            </section>

            <section
              v-else
              class="flex h-full min-h-0 min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <div
                class="flex h-full w-[300px] shrink-0 flex-col border-r border-gray-200 bg-white"
              >
                <div class="border-b border-gray-200 bg-gray-50/50 px-3 py-3">
                  <h2 class="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Workspace Explorer
                  </h2>
                </div>

                <div class="flex-1 overflow-y-auto py-2">
                  <ul class="flex flex-col">
                    <template v-for="doc in documents" :key="doc.docId">
                      <li
                        class="mt-2 flex items-center border-y border-gray-100 bg-gray-50 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-700 first:mt-0"
                      >
                        <svg
                          class="mr-1.5 h-3.5 w-3.5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        {{ doc.filename }}
                      </li>

                      <li
                        v-for="node in doc.nodes"
                        :key="node.id"
                        class="group flex w-full cursor-pointer items-stretch transition-colors duration-150"
                        :class="getNodeClass(node.id)"
                        :title="node.preview"
                        @click="handleTocClick(node.id)"
                      >
                        <div class="flex items-stretch pl-3">
                          <div
                            v-for="depth in node.level"
                            :key="`${node.id}-${depth}`"
                            class="w-3.5 shrink-0 border-l transition-colors duration-200"
                            :class="getNodeRailClass(node.id)"
                          />
                        </div>

                        <div class="flex min-w-0 flex-1 items-center py-1 pl-1 pr-2 text-[12px]">
                          <span
                            class="mr-2 h-1.5 w-1.5 shrink-0 rounded-full"
                            :class="typeColorMap[node.type]?.dot ?? typeColorMap.response.dot"
                          />
                          <span class="truncate" :class="getNodeTextClass(node.id)">
                            {{ node.title }}
                          </span>
                        </div>
                      </li>
                    </template>
                  </ul>
                </div>
              </div>

              <div
                ref="contentRef"
                class="min-h-0 min-w-0 flex-1 overflow-y-auto bg-[#f8f9fa] p-6 font-mono text-sm text-gray-800 antialiased md:p-10"
              >
                <div class="mx-auto max-w-4xl space-y-12 pb-64">
                  <div
                    v-for="doc in documents"
                    :key="doc.docId"
                    class="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]"
                  >
                    <div
                      class="flex items-center justify-between border-b border-gray-200 bg-[#fbfcfd] px-5 py-3"
                    >
                      <div class="flex items-center space-x-4">
                        <div class="flex space-x-1.5">
                          <div class="h-3 w-3 rounded-full bg-red-400" />
                          <div class="h-3 w-3 rounded-full bg-yellow-400" />
                          <div class="h-3 w-3 rounded-full bg-green-400" />
                        </div>
                        <span class="text-sm font-semibold text-gray-700">{{ doc.filename }}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <div class="rounded bg-gray-100 px-2 py-1 text-xs text-gray-400">
                          {{ doc.type.toUpperCase() }}
                        </div>
                        <div class="flex items-center rounded-lg bg-gray-100 p-1">
                          <button
                            class="rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors"
                            :class="
                              getDocViewMode(doc.docId) === 'json'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-800'
                            "
                            type="button"
                            @click="setDocViewMode(doc.docId, 'json')"
                          >
                            JSON
                          </button>
                          <button
                            class="rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors"
                            :class="
                              getDocViewMode(doc.docId) === 'yaml'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-800'
                            "
                            type="button"
                            @click="setDocViewMode(doc.docId, 'yaml')"
                          >
                            YAML
                          </button>
                        </div>
                      </div>
                    </div>

                    <div class="overflow-x-auto p-6">
                      <div class="mb-3 select-none text-sm text-gray-500">
                        <span class="font-semibold text-[#0451a5]">const</span>
                        payload
                        <span class="text-gray-600">=</span>
                        {{ getDocViewMode(doc.docId) === 'json' ? '{' : '' }}
                      </div>

                      <div class="space-y-0.5">
                        <div
                          v-for="line in doc.lines"
                          :id="line.key"
                          :key="line.key"
                          :ref="(el) => registerLineRef(line, el)"
                          :data-outline-id="line.outlineId"
                          class="rounded px-3 py-1 leading-relaxed transition-colors duration-300 scroll-mt-24"
                          :class="getLineClass(line.outlineId)"
                        >
                          <pre
                            class="m-0 whitespace-pre-wrap break-words"
                          ><code>{{ line.text }}</code></pre>
                        </div>
                      </div>

                      <div
                        v-if="getDocViewMode(doc.docId) === 'json'"
                        class="mt-3 select-none text-sm text-gray-500"
                      >
                        }
                      </div>
                    </div>

                    <div
                      class="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-5 py-2.5 text-gray-500"
                    >
                      <div class="flex items-center text-xs">
                        <span class="mr-2 h-1.5 w-1.5 rounded-full bg-green-500" />
                        {{ doc.nodes.length }} fields indexed
                      </div>
                      <button
                        class="flex items-center space-x-1 text-xs transition-colors hover:text-blue-600"
                        type="button"
                      >
                        <svg
                          class="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        <span>Copy Payload</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { stringify as stringifyYaml } from 'yaml'
import { X } from 'lucide-vue-next'
import { useNormalChatChatDetailShellStore } from '@renderer/stores/normal-chat/chat-detail-shell/chat-detail-shell.store'

type NodeType = keyof typeof typeColorMap
type DocViewMode = 'json' | 'yaml'
type DetailDocId = 'doc-request' | 'doc-response'

interface OutlineNode {
  id: string
  title: string
  level: number
  type: NodeType
  preview: string
}

interface DocLine {
  key: string
  outlineId: string
  text: string
  primary: boolean
}

interface DetailDocument {
  docId: DetailDocId
  filename: string
  type: 'system' | 'interaction'
  nodes: OutlineNode[]
  lines: DocLine[]
}

const typeColorMap = {
  interaction: { dot: 'bg-gray-500', border: 'border-gray-300', text: 'text-gray-600' },
  system: { dot: 'bg-red-500', border: 'border-red-200', text: 'text-red-600' },
  prompt: { dot: 'bg-green-500', border: 'border-green-300', text: 'text-green-600' },
  response: { dot: 'bg-blue-500', border: 'border-blue-300', text: 'text-blue-600' },
  reasoning: { dot: 'bg-purple-400', border: 'border-purple-200', text: 'text-purple-600' },
  tool: { dot: 'bg-orange-500', border: 'border-orange-300', text: 'text-orange-600' },
  output: { dot: 'bg-teal-500', border: 'border-teal-200', text: 'text-teal-600' },
  config: { dot: 'bg-slate-500', border: 'border-slate-300', text: 'text-slate-600' }
} as const

const detailShellStore = useNormalChatChatDetailShellStore()
const { snapshot, dialogTitle, breadcrumbText, llmCallItems, selectedCallItem } =
  storeToRefs(detailShellStore)

const contentRef = ref<HTMLElement | null>(null)
const activeOutlineId = ref('')
const flashOutlineId = ref('')
const lineRefRegistry = new Map<string, HTMLElement>()
let observer: IntersectionObserver | null = null
let flashTimer: ReturnType<typeof setTimeout> | null = null

const documents = computed<DetailDocument[]>((): DetailDocument[] => {
  const requestPayload = (selectedCallItem.value?.requestPayload ?? {}) as Record<string, unknown>
  const responsePayload = (selectedCallItem.value?.responsePayload ?? {}) as Record<string, unknown>

  const requestTree = buildTree('request', requestPayload)
  const responseTree = buildTree('response', responsePayload)

  return [
    {
      docId: 'doc-request' as const,
      filename: 'request_raw_object.json',
      type: 'system' as const,
      nodes: requestTree.nodes,
      lines:
        getDocViewMode('doc-request') === 'json'
          ? buildJsonLines(requestTree.value, 'request')
          : buildYamlLines(requestTree.value, 'request')
    },
    {
      docId: 'doc-response' as const,
      filename: 'response_raw_object.json',
      type: 'interaction' as const,
      nodes: responseTree.nodes,
      lines:
        getDocViewMode('doc-response') === 'json'
          ? buildJsonLines(responseTree.value, 'response')
          : buildYamlLines(responseTree.value, 'response')
    }
  ].filter((doc) => doc.nodes.length > 0)
})

function getNodeType(path: string): NodeType {
  if (path.includes('prompt')) {
    return 'prompt'
  }
  if (path.includes('history') || path.includes('streamText')) {
    return 'interaction'
  }
  if (path.includes('loadedActions')) {
    return 'tool'
  }
  if (path.includes('actionResults') || path.includes('error')) {
    return 'output'
  }
  if (path.includes('timing') || path.includes('requestMeta') || path.includes('rawRequest')) {
    return 'config'
  }
  return 'response'
}

function prettifyLabel(segment: string): string {
  return segment
    .replaceAll(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll(/[_-]/g, ' ')
    .replace(/^./, (value) => value.toUpperCase())
}

function buildTree(
  root: string,
  value: Record<string, unknown>
): { value: Record<string, unknown>; nodes: OutlineNode[] } {
  return {
    value,
    nodes: flattenOutline(root, value, 1)
  }
}

function flattenOutline(path: string, value: unknown, level: number): OutlineNode[] {
  const segment = path.split('.').at(-1) ?? path
  const nodes: OutlineNode[] = [
    {
      id: path,
      title: prettifyLabel(segment),
      level,
      type: getNodeType(path),
      preview: makePreview(value)
    }
  ]

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      nodes.push(...flattenOutline(`${path}.${index}`, item, level + 1))
    })
    return nodes
  }

  if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
      nodes.push(...flattenOutline(`${path}.${key}`, child, level + 1))
    })
  }

  return nodes
}

function makePreview(value: unknown): string {
  if (typeof value === 'string') {
    return value.slice(0, 120)
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    return `${value.length} items`
  }
  if (value && typeof value === 'object') {
    return `${Object.keys(value as Record<string, unknown>).length} fields`
  }
  return String(value ?? '')
}

function getDocViewMode(docId: DetailDocId): DocViewMode {
  return docId === 'doc-request' ? snapshot.value.requestViewMode : snapshot.value.responseViewMode
}

function setDocViewMode(docId: DetailDocId, mode: DocViewMode): void {
  if (docId === 'doc-request') {
    detailShellStore.setRequestViewMode(mode)
    return
  }
  detailShellStore.setResponseViewMode(mode)
}

function formatScalar(value: unknown): string {
  if (typeof value === 'string') {
    return JSON.stringify(value)
  }
  if (value === null) {
    return 'null'
  }
  if (value === undefined) {
    return 'undefined'
  }
  return String(value)
}

function buildJsonLines(value: unknown, path: string, depth = 0): DocLine[] {
  const indent = '  '.repeat(depth)

  if (Array.isArray(value)) {
    const lines: DocLine[] = [
      { key: `${path}::__open`, outlineId: path, text: `${indent}[`, primary: true }
    ]
    value.forEach((item, index) => {
      lines.push(...buildJsonLines(item, `${path}.${index}`, depth + 1))
    })
    lines.push({ key: `${path}::__close`, outlineId: path, text: `${indent}]`, primary: false })
    return lines
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    return entries.flatMap(([key, child], index) => {
      const childPath = `${path}.${key}`
      const trailingComma = index === entries.length - 1 ? '' : ','

      if (Array.isArray(child)) {
        const childLines = buildJsonLines(child, childPath, depth + 1)
        const opener = {
          key: `${childPath}::__open`,
          outlineId: childPath,
          text: `${indent}  "${key}": [`,
          primary: true
        }
        const closer = {
          key: `${childPath}::__close`,
          outlineId: childPath,
          text: `${indent}  ]${trailingComma}`,
          primary: false
        }
        return [opener, ...childLines.slice(1, -1), closer]
      }

      if (child && typeof child === 'object') {
        const childLines = buildJsonLines(child, childPath, depth + 1)
        const opener = {
          key: `${childPath}::__open`,
          outlineId: childPath,
          text: `${indent}  "${key}": {`,
          primary: true
        }
        const closer = {
          key: `${childPath}::__close`,
          outlineId: childPath,
          text: `${indent}  }${trailingComma}`,
          primary: false
        }
        return [opener, ...childLines.slice(1, -1), closer]
      }

      return [
        {
          key: `${childPath}::__value`,
          outlineId: childPath,
          text: `${indent}  "${key}": ${formatScalar(child)}${trailingComma}`,
          primary: true
        }
      ]
    })
  }

  return [
    {
      key: `${path}::__value`,
      outlineId: path,
      text: `${indent}${formatScalar(value)}`,
      primary: true
    }
  ]
}

function buildYamlLines(value: unknown, path: string, depth = 0): DocLine[] {
  const indent = '  '.repeat(depth)

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => {
      const itemPath = `${path}.${index}`
      const dump = stringifyYaml(item, { indent: 2, lineWidth: 0, blockQuote: 'literal' }).trimEnd()
      const dumpLines = dump.split('\n')
      return dumpLines.map((line, lineIndex) => ({
        key: `${itemPath}::__yaml_${lineIndex}`,
        outlineId: itemPath,
        text: lineIndex === 0 ? `${indent}- ${line}` : `${indent}  ${line}`,
        primary: lineIndex === 0
      }))
    })
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
      const childPath = `${path}.${key}`
      if (child && typeof child === 'object') {
        if (Array.isArray(child) && child.length === 0) {
          return [
            {
              key: `${childPath}::__empty`,
              outlineId: childPath,
              text: `${indent}${key}: []`,
              primary: true
            }
          ]
        }
        if (!Array.isArray(child) && Object.keys(child as Record<string, unknown>).length === 0) {
          return [
            {
              key: `${childPath}::__empty`,
              outlineId: childPath,
              text: `${indent}${key}: {}`,
              primary: true
            }
          ]
        }
        return [
          {
            key: `${childPath}::__head`,
            outlineId: childPath,
            text: `${indent}${key}:`,
            primary: true
          },
          ...buildYamlLines(child, childPath, depth + 1)
        ]
      }

      const dump = stringifyYaml(child, {
        indent: 2,
        lineWidth: 0,
        blockQuote: 'literal'
      }).trimEnd()
      const dumpLines = dump.split('\n')
      return dumpLines.map((line, lineIndex) => ({
        key: `${childPath}::__yaml_${lineIndex}`,
        outlineId: childPath,
        text: lineIndex === 0 ? `${indent}${key}: ${line}` : `${indent}  ${line}`,
        primary: lineIndex === 0
      }))
    })
  }

  const dump = stringifyYaml(value, { indent: 2, lineWidth: 0, blockQuote: 'literal' }).trimEnd()
  return dump.split('\n').map((line, index) => ({
    key: `${path}::__yaml_${index}`,
    outlineId: path,
    text: `${indent}${line}`,
    primary: index === 0
  }))
}

function getNodeClass(nodeId: string): string {
  if (isOutlineFlashed(nodeId)) {
    return 'bg-amber-100'
  }
  if (isOutlineActive(nodeId)) {
    return 'bg-blue-50'
  }
  return 'hover:bg-gray-100/60'
}

function getNodeRailClass(nodeId: string): string {
  if (isOutlineFlashed(nodeId)) {
    return 'border-amber-300'
  }
  if (isOutlineActive(nodeId)) {
    return 'border-blue-200'
  }
  return 'border-gray-100 group-hover:border-gray-200'
}

function getNodeTextClass(nodeId: string): string {
  if (isOutlineFlashed(nodeId)) {
    return 'font-medium text-amber-800'
  }
  if (isOutlineActive(nodeId)) {
    return 'font-medium text-blue-700'
  }
  return 'text-gray-700'
}

function getLineClass(outlineId: string): string {
  if (isOutlineFlashed(outlineId)) {
    return 'bg-amber-100 text-gray-950'
  }
  if (isOutlineActive(outlineId)) {
    return 'bg-blue-50 text-gray-950'
  }
  return 'text-gray-700 hover:bg-gray-50'
}

function isOutlineActive(outlineId: string): boolean {
  return (
    !!activeOutlineId.value &&
    (outlineId === activeOutlineId.value || activeOutlineId.value.startsWith(`${outlineId}.`))
  )
}

function isOutlineFlashed(outlineId: string): boolean {
  return (
    !!flashOutlineId.value &&
    (outlineId === flashOutlineId.value || flashOutlineId.value.startsWith(`${outlineId}.`))
  )
}

function registerLineRef(line: DocLine, el: Element | { $el?: Element } | null): void {
  if (!line.primary) {
    return
  }

  const resolved = el instanceof HTMLElement ? el : el && '$el' in el ? el.$el : null

  if (!(resolved instanceof HTMLElement)) {
    lineRefRegistry.delete(line.outlineId)
    return
  }

  lineRefRegistry.set(line.outlineId, resolved)
}

function clearObserver(): void {
  observer?.disconnect()
  observer = null
}

function rebuildObserver(): void {
  clearObserver()

  if (!contentRef.value || !lineRefRegistry.size) {
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

      const nextOutlineId = visible[0]?.target.getAttribute('data-outline-id')
      if (nextOutlineId) {
        activeOutlineId.value = nextOutlineId
      }
    },
    {
      root: contentRef.value,
      rootMargin: '-12% 0px -72% 0px',
      threshold: [0, 0.01, 0.1, 0.5]
    }
  )

  Array.from(lineRefRegistry.values()).forEach((element) => observer?.observe(element))
}

function clearFlashTimer(): void {
  if (flashTimer) {
    clearTimeout(flashTimer)
    flashTimer = null
  }
}

function triggerFlash(outlineId: string): void {
  clearFlashTimer()
  flashOutlineId.value = outlineId
  flashTimer = setTimeout(() => {
    flashOutlineId.value = ''
    flashTimer = null
  }, 1200)
}

function scrollToOutline(outlineId: string): void {
  const element = lineRefRegistry.get(outlineId)
  if (!element || !contentRef.value) {
    return
  }

  activeOutlineId.value = outlineId
  contentRef.value.scrollTo({ top: Math.max(0, element.offsetTop - 12), behavior: 'smooth' })
}

function handleTocClick(outlineId: string): void {
  scrollToOutline(outlineId)
  triggerFlash(outlineId)
}

watch(
  documents,
  async (docs) => {
    lineRefRegistry.clear()
    activeOutlineId.value = docs[0]?.nodes[0]?.id ?? ''
    flashOutlineId.value = ''

    await nextTick()
    rebuildObserver()

    if (contentRef.value) {
      contentRef.value.scrollTop = 0
    }
  },
  { immediate: true }
)

watch(
  () => snapshot.value.currentPage,
  async (page) => {
    if (page !== 'llm-call') {
      clearObserver()
      lineRefRegistry.clear()
      activeOutlineId.value = ''
      flashOutlineId.value = ''
      clearFlashTimer()
      return
    }

    await nextTick()
    rebuildObserver()
  }
)

onBeforeUnmount(() => {
  clearObserver()
  clearFlashTimer()
  lineRefRegistry.clear()
})
</script>
