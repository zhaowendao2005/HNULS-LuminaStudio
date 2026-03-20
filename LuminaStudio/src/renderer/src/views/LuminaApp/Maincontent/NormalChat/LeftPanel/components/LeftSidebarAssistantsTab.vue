<template>
  <div class="nc-left-assistants-tab-a9k2 flex h-full flex-col py-2">
    <button
      class="mx-2 mb-2 flex items-center gap-2 rounded-lg px-4 py-2 text-[14px] text-gray-600 transition-colors hover:bg-gray-200/50"
      type="button"
      @click="workspaceStore.openCreateAssistantDialog"
    >
      <Plus class="h-4 w-4" />
      添加助手
    </button>

    <div class="px-2">
      <section v-for="group in workspaceStore.assistantGroups" :key="group.key" class="mb-4">
        <button
          class="flex w-full items-center gap-1 px-2 py-2 text-[13px] text-gray-500 transition-colors hover:text-gray-800"
          type="button"
          @click="toggleGroup(group.key)"
        >
          <ChevronRight v-if="!expandedGroups[group.key]" class="h-3.5 w-3.5" />
          <ChevronDown v-else class="h-3.5 w-3.5" />
          {{ group.label }}
        </button>

        <div v-if="expandedGroups[group.key]" class="mt-1 space-y-3">
          <div
            v-for="assistant in group.assistants"
            :key="assistant.id"
            class="flex cursor-pointer items-center justify-between rounded-xl border p-2 shadow-sm transition-colors"
            :class="
              assistant.id === workspaceStore.snapshot.activeAssistantId
                ? 'border-emerald-200 bg-emerald-50/70'
                : 'border-gray-100 bg-white hover:border-gray-200'
            "
            @click="workspaceStore.setActiveAssistant(assistant.id)"
            @contextmenu.prevent="openContextMenu(assistant.id, $event)"
          >
            <div class="flex min-w-0 items-center gap-3">
              <span class="nc-default-assistant-avatar-a9k2 text-sm">{{ assistant.emoji }}</span>
              <span class="truncate text-[14px] font-medium text-gray-800">
                {{ assistant.name }}
              </span>
            </div>
            <button
              class="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              type="button"
              @click.stop="openContextMenu(assistant.id, $event)"
            >
              <MoreVertical class="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
    <div v-if="contextMenuOpen" class="fixed inset-0 z-40" @click="closeContextMenu" />

    <div
      v-if="contextMenuOpen && contextAssistant"
      class="fixed z-50 w-[188px] rounded-2xl border border-gray-200 bg-white p-1.5 shadow-[0_18px_48px_rgba(15,23,42,0.18)]"
      :style="{ left: `${menuPosition.x}px`, top: `${menuPosition.y}px` }"
    >
      <div class="space-y-1">
        <div
          class="relative rounded-xl pr-2"
          @mouseenter="labelSubmenuOpen = true"
          @mouseleave="labelSubmenuOpen = false"
        >
          <button
            class="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-[13px] text-gray-700 transition-colors hover:bg-gray-50"
            type="button"
            @click="labelSubmenuOpen = !labelSubmenuOpen"
          >
            <span>标签管理</span>
            <ChevronRight class="h-4 w-4 text-gray-400" />
          </button>

          <div v-if="labelSubmenuOpen" class="absolute left-full top-0 z-10 pl-2">
            <div
              class="w-[208px] rounded-2xl border border-gray-200 bg-white p-1.5 shadow-[0_18px_48px_rgba(15,23,42,0.18)]"
            >
              <div class="max-h-[220px] overflow-y-auto">
                <button
                  class="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-[13px] transition-colors hover:bg-gray-50"
                  :class="!contextAssistant.labelId ? 'text-emerald-700' : 'text-gray-700'"
                  type="button"
                  @click="assignLabel(null)"
                >
                  <span>未分类</span>
                  <Check v-if="!contextAssistant.labelId" class="h-4 w-4" />
                </button>
                <button
                  v-for="label in workspaceStore.snapshot.labels"
                  :key="label.id"
                  class="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-[13px] transition-colors hover:bg-gray-50"
                  :class="
                    contextAssistant.labelId === label.id ? 'text-emerald-700' : 'text-gray-700'
                  "
                  type="button"
                  @click="assignLabel(label.id)"
                >
                  <span class="truncate">{{ label.name }}</span>
                  <Check v-if="contextAssistant.labelId === label.id" class="h-4 w-4" />
                </button>
              </div>

              <div class="my-1.5 h-px bg-gray-100" />

              <div class="space-y-1">
                <button
                  class="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] text-gray-700 transition-colors hover:bg-gray-50"
                  type="button"
                  @click="openCreateLabelDialog"
                >
                  <Plus class="h-4 w-4 text-gray-400" />
                  添加标签
                </button>
                <button
                  class="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] text-gray-700 transition-colors hover:bg-gray-50"
                  type="button"
                  @click="openLabelManagerDialog"
                >
                  <Tags class="h-4 w-4 text-gray-400" />
                  标签管理
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="my-1 h-px bg-gray-100" />

        <button
          class="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] text-gray-700 transition-colors hover:bg-gray-50"
          type="button"
          @click="openAssistantPromptSettings"
        >
          <MessageSquareText class="h-4 w-4 text-gray-400" />
          提示词设置
        </button>
      </div>
    </div>

    <div
      v-if="createLabelDialogOpen"
      class="nc-backdrop-fade-in-a9k2 fixed inset-0 z-[60] flex items-center justify-center bg-black/15 backdrop-blur-[1px]"
    >
      <div
        class="nc-dialog-slide-up-a9k2 w-[420px] rounded-2xl bg-white p-6 shadow-[var(--nc-shadow-dialog)]"
      >
        <div class="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 class="text-[16px] font-semibold text-gray-900">添加标签</h3>
            <p class="mt-1 text-[13px] text-gray-500">输入一个标签名称，用于整理左侧助手分组。</p>
          </div>
          <button
            class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            type="button"
            @click="closeCreateLabelDialog"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <input
          v-model="newLabelDraft"
          class="w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] text-gray-800 outline-none focus:border-emerald-300"
          placeholder="例如：学习 / 写作 / 翻译"
          type="text"
        />

        <div class="mt-5 flex items-center justify-end gap-3">
          <button
            class="rounded-lg border border-gray-200 px-4 py-2 text-[14px] text-gray-600 transition-colors hover:bg-gray-50"
            type="button"
            @click="closeCreateLabelDialog"
          >
            取消
          </button>
          <button
            class="rounded-lg bg-[var(--nc-accent)] px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-[var(--nc-accent-hover)]"
            type="button"
            @click="createLabel"
          >
            保存
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="labelManagerDialogOpen"
      class="nc-backdrop-fade-in-a9k2 fixed inset-0 z-[60] flex items-center justify-center bg-black/15 backdrop-blur-[1px]"
    >
      <div
        class="nc-dialog-slide-up-a9k2 flex h-[560px] w-[560px] flex-col rounded-2xl bg-white p-6 shadow-[var(--nc-shadow-dialog)]"
      >
        <div class="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 class="text-[16px] font-semibold text-gray-900">标签管理</h3>
            <p class="mt-1 text-[13px] text-gray-500">
              重命名或删除现有标签，删除后相关助手会回到未分类。
            </p>
          </div>
          <button
            class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            type="button"
            @click="closeLabelManagerDialog"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="flex-1 space-y-3 overflow-y-auto pr-1">
          <div
            v-for="label in workspaceStore.snapshot.labels"
            :key="label.id"
            class="rounded-2xl border border-gray-200 bg-gray-50/70 p-3"
          >
            <div class="flex items-center gap-2">
              <input
                :value="labelDrafts[label.id] ?? label.name"
                class="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[14px] text-gray-800 outline-none focus:border-emerald-300"
                type="text"
                @input="setLabelDraft(label.id, $event)"
              />
              <button
                class="rounded-lg border border-gray-200 px-3 py-2 text-[13px] text-gray-600 transition-colors hover:bg-white"
                type="button"
                @click="renameLabel(label.id)"
              >
                保存
              </button>
              <button
                class="rounded-lg border border-rose-200 px-3 py-2 text-[13px] text-rose-600 transition-colors hover:bg-rose-50"
                type="button"
                @click="deleteLabel(label.id)"
              >
                删除
              </button>
            </div>
          </div>

          <div
            v-if="workspaceStore.snapshot.labels.length === 0"
            class="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-[13px] text-gray-400"
          >
            当前还没有标签，先创建一个试试。
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  ChevronDown,
  ChevronRight,
  Check,
  MessageSquareText,
  MoreVertical,
  Plus,
  Tags,
  X
} from 'lucide-vue-next'
import { useNormalChatWorkspaceStore } from '@renderer/stores/normal-chat/workspace/workspace.store'

const workspaceStore = useNormalChatWorkspaceStore()

const contextMenuOpen = ref(false)
const labelSubmenuOpen = ref(false)
const contextAssistantId = ref('')
const menuPosition = ref({ x: 0, y: 0 })
const expandedGroups = ref<Record<string, boolean>>({})

const createLabelDialogOpen = ref(false)
const labelManagerDialogOpen = ref(false)
const newLabelDraft = ref('')
const labelDrafts = ref<Record<string, string>>({})

const contextAssistant = computed(() => {
  return (
    workspaceStore.snapshot.assistants.find(
      (assistant) => assistant.id === contextAssistantId.value
    ) ?? null
  )
})

watch(
  () => workspaceStore.snapshot.labels,
  (labels) => {
    labelDrafts.value = Object.fromEntries(labels.map((label) => [label.id, label.name]))
  },
  { immediate: true }
)

watch(
  () => workspaceStore.assistantGroups,
  (groups) => {
    const nextExpandedGroups: Record<string, boolean> = {}
    groups.forEach((group) => {
      nextExpandedGroups[group.key] = expandedGroups.value[group.key] ?? true
    })
    expandedGroups.value = nextExpandedGroups
  },
  { immediate: true, deep: true }
)

const toggleGroup = (groupKey: string) => {
  expandedGroups.value = {
    ...expandedGroups.value,
    [groupKey]: !expandedGroups.value[groupKey]
  }
}

const openContextMenu = (assistantId: string, event: MouseEvent) => {
  contextAssistantId.value = assistantId
  contextMenuOpen.value = true
  labelSubmenuOpen.value = false

  const nextX = Math.min(event.clientX + 8, window.innerWidth - 240)
  const nextY = Math.min(event.clientY + 8, window.innerHeight - 180)
  menuPosition.value = { x: Math.max(nextX, 12), y: Math.max(nextY, 12) }
}

const closeContextMenu = () => {
  contextMenuOpen.value = false
  labelSubmenuOpen.value = false
}

const assignLabel = async (labelId: string | null) => {
  if (!contextAssistant.value) {
    return
  }

  await workspaceStore.assignAssistantLabel(contextAssistant.value.id, labelId)
  closeContextMenu()
}

const openCreateLabelDialog = () => {
  newLabelDraft.value = ''
  createLabelDialogOpen.value = true
  closeContextMenu()
}

const closeCreateLabelDialog = () => {
  createLabelDialogOpen.value = false
  newLabelDraft.value = ''
}

const createLabel = async () => {
  if (!newLabelDraft.value.trim()) {
    return
  }

  await workspaceStore.createLabel(newLabelDraft.value)
  closeCreateLabelDialog()
}

const openLabelManagerDialog = () => {
  labelManagerDialogOpen.value = true
  closeContextMenu()
}

const closeLabelManagerDialog = () => {
  labelManagerDialogOpen.value = false
}

const setLabelDraft = (labelId: string, event: Event) => {
  labelDrafts.value = {
    ...labelDrafts.value,
    [labelId]: (event.target as HTMLInputElement).value
  }
}

const renameLabel = async (labelId: string) => {
  const nextName = labelDrafts.value[labelId]?.trim()
  if (!nextName) {
    return
  }

  await workspaceStore.renameLabel(labelId, nextName)
}

const deleteLabel = async (labelId: string) => {
  await workspaceStore.deleteLabel(labelId)
}

const openAssistantPromptSettings = async () => {
  if (!contextAssistant.value) {
    return
  }

  closeContextMenu()
  await workspaceStore.openAssistantSettingsForAssistant(contextAssistant.value.id, 'prompt')
}
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
