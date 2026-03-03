<template>
  <CenteredDialog
    v-model="visible"
    title="添加变量"
    subtitle="为开始节点配置一个新的输入字段"
    class="of-start-node-add-field-dialog"
  >
    <div class="space-y-5">
      <!-- 字段类型选择 -->
      <div>
        <div class="font-semibold leading-8 text-gray-600 mb-1">字段类型</div>
        <div ref="typeDropdownRef" class="relative">
          <div
            class="group flex h-10 items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 hover:bg-emerald-50/30 hover:border-emerald-200 cursor-pointer transition-colors"
            @click="toggleTypeDropdown"
          >
            <div class="flex items-center">
              <component :is="selectedType.icon" class="size-4 shrink-0 text-gray-500" />
              <span class="ml-2 text-gray-800 font-medium">
                {{ selectedType.name }}
              </span>
            </div>
            <div class="flex items-center space-x-2">
              <div
                class="inline-flex h-5 items-center rounded bg-emerald-100/50 border border-emerald-200/50 px-1.5 text-xs font-medium text-emerald-700"
              >
                {{ selectedType.type }}
              </div>
              <svg
                class="h-4 w-4 text-gray-400 transition-transform"
                :class="{ 'rotate-180': isTypeDropdownOpen }"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>

          <!-- 字段类型下拉列表 -->
          <div
            v-if="isTypeDropdownOpen"
            class="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5"
          >
            <div
              v-for="type in FIELD_TYPES"
              :key="type.id"
              class="flex items-center justify-between px-3 py-2"
              :class="[
                type.id === 'text' ? 'cursor-pointer hover:bg-emerald-50' : 'cursor-not-allowed opacity-40',
                { 'bg-emerald-50/60': selectedType.id === type.id }
              ]"
              @click="type.id === 'text' ? selectType(type) : null"
            >
              <div class="flex items-center">
                <component
                  :is="type.icon"
                  class="size-4 shrink-0"
                  :class="selectedType.id === type.id ? 'text-emerald-600' : 'text-gray-500'"
                />
                <span
                  class="ml-2"
                  :class="
                    selectedType.id === type.id ? 'text-emerald-700 font-medium' : 'text-gray-700'
                  "
                >
                  {{ type.name }}
                  <!-- 临时禁用标记：仅文本类型可用，其他类型待后续扩展 -->
                  <span v-if="type.id !== 'text'" class="ml-1 text-xs text-gray-400">(待扩展)</span>
                </span>
              </div>
              <div
                class="inline-flex h-5 items-center rounded border border-gray-100 px-1.5 text-xs text-gray-400"
              >
                {{ type.type }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 公共字段: 变量名称 -->
      <div>
        <div class="font-semibold leading-8 text-gray-600 mb-1">变量名称</div>
        <input
          v-model="form.name"
          class="w-full appearance-none rounded-lg border border-transparent bg-gray-50 px-3 py-2 text-gray-800 outline-none placeholder:text-gray-400 hover:border-emerald-200 hover:bg-emerald-50/20 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all"
          placeholder="请输入"
        />
      </div>

      <!-- 公共字段: 显示名称 -->
      <div>
        <div class="font-semibold leading-8 text-gray-600 mb-1">显示名称</div>
        <input
          v-model="form.label"
          class="w-full appearance-none rounded-lg border border-transparent bg-gray-50 px-3 py-2 text-gray-800 outline-none placeholder:text-gray-400 hover:border-emerald-200 hover:bg-emerald-50/20 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all"
          placeholder="请输入"
        />
      </div>

      <!-- 中间动态配置区域：按字段类型切换 -->
      <!-- 文本类配置 -->
      <template v-if="selectedType.id === 'text' || selectedType.id === 'paragraph'">
        <div>
          <div class="font-semibold leading-8 text-gray-600 mb-1">最大长度</div>
          <input
            type="number"
            class="w-full appearance-none rounded-lg border border-transparent bg-gray-50 px-3 py-2 text-gray-800 outline-none placeholder:text-gray-400 hover:border-emerald-200 hover:bg-emerald-50/20 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all"
            placeholder="请输入"
            :max="selectedType.id === 'text' ? 256 : undefined"
          />
        </div>
        <div>
          <div class="font-semibold leading-8 text-gray-600 mb-1">默认值</div>
          <input
            v-if="selectedType.id === 'text'"
            class="w-full appearance-none rounded-lg border border-transparent bg-gray-50 px-3 py-2 text-gray-800 outline-none placeholder:text-gray-400 hover:border-emerald-200 hover:bg-emerald-50/20 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all"
            placeholder="请输入"
          />
          <textarea
            v-else
            class="w-full min-h-[80px] appearance-none rounded-lg border border-transparent bg-gray-50 px-3 py-2 text-gray-800 outline-none placeholder:text-gray-400 hover:border-emerald-200 hover:bg-emerald-50/20 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all"
            placeholder="请输入"
          />
        </div>
      </template>

      <!-- 下拉选项配置 -->
      <div v-else-if="selectedType.id === 'select'">
        <div class="font-semibold leading-8 text-gray-600 mb-1">选项</div>
        <div
          class="flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-emerald-50 px-3 text-emerald-700 hover:bg-emerald-100 transition-colors w-max"
        >
          <PlusIcon class="h-4 w-4" />
          <span class="font-medium text-[13px]">添加选项</span>
        </div>
      </div>

      <!-- 数字配置 -->
      <div v-else-if="selectedType.id === 'number'">
        <div class="font-semibold leading-8 text-gray-600 mb-1">默认值</div>
        <input
          type="number"
          class="w-full appearance-none rounded-lg border border-transparent bg-gray-50 px-3 py-2 text-gray-800 outline-none placeholder:text-gray-400 hover:border-emerald-200 hover:bg-emerald-50/20 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all"
          placeholder="请输入"
        />
      </div>

      <!-- 复选框配置 -->
      <div v-else-if="selectedType.id === 'checkbox'">
        <div class="font-semibold leading-8 text-gray-600 mb-1">默认值</div>
        <div class="relative">
          <select
            class="w-full appearance-none rounded-lg border border-transparent bg-gray-50 px-3 py-2 text-gray-800 outline-none hover:border-emerald-200 hover:bg-emerald-50/20 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer pr-10"
          >
            <option value="false">不默认选中</option>
            <option value="true">默认选中</option>
          </select>
          <ChevronDownIcon
            class="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none"
          />
        </div>
      </div>

      <!-- 文件类配置 -->
      <template v-else-if="selectedType.id === 'file' || selectedType.id === 'file_list'">
        <div>
          <div class="font-semibold leading-8 text-gray-600 mb-1">支持的文件类型</div>
          <div class="space-y-2">
            <div
              v-for="cat in FILE_CATEGORIES"
              :key="cat.id"
              class="flex cursor-pointer items-center rounded-lg border p-3 transition-colors"
              :class="
                cat.selected
                  ? 'border-emerald-500 bg-emerald-50/40'
                  : 'border-gray-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/10'
              "
            >
              <component :is="cat.icon" class="size-5 shrink-0" :class="cat.color" />
              <div class="mx-3 grow">
                <div class="font-medium text-gray-900 leading-tight">
                  {{ cat.name }}
                </div>
                <div class="mt-1 text-[11px] text-gray-500 uppercase">
                  {{ cat.desc }}
                </div>
              </div>
              <div
                class="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
                :class="
                  cat.selected
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-gray-300 bg-gray-50'
                "
              >
                <CheckIcon v-if="cat.selected" class="h-3 w-3" stroke-width="3" />
              </div>
            </div>
          </div>
        </div>

        <div>
          <div class="font-semibold leading-8 text-gray-600 mb-1">上传文件类型</div>
          <div class="grid grid-cols-3 gap-2 rounded-lg bg-gray-100 p-1">
            <div
              class="flex h-8 cursor-pointer items-center justify-center rounded-md text-gray-600 hover:bg-white hover:text-emerald-700 hover:shadow-sm transition-all text-xs"
            >
              本地上传
            </div>
            <div
              class="flex h-8 cursor-pointer items-center justify-center rounded-md text-gray-600 hover:bg-white hover:text-emerald-700 hover:shadow-sm transition-all text-xs"
            >
              URL
            </div>
            <div
              class="flex h-8 cursor-pointer items-center justify-center rounded-md bg-white font-medium text-emerald-800 shadow-sm border border-emerald-100 text-xs"
            >
              两者
            </div>
          </div>
        </div>

        <div v-if="selectedType.id === 'file_list'">
          <div class="font-semibold leading-8 text-gray-600 mb-1">最大上传数</div>
          <div class="text-xs text-gray-500 mb-2 italic">
            文档 &lt; 15.00 MB, 图片 &lt; 10.00 MB, 音频 &lt; 50.00 MB
          </div>
          <div class="flex items-center space-x-4">
            <input
              v-model.number="fileLimit"
              type="number"
              min="1"
              max="10"
              class="block h-9 w-16 shrink-0 appearance-none rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-emerald-500 focus:bg-white"
            />
            <div class="relative grow h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                class="absolute left-0 top-0 h-full bg-emerald-500 rounded-full"
                :style="{ width: `${(fileLimit / 10) * 100}%` }"
              />
            </div>
          </div>
        </div>

        <div>
          <div class="font-semibold leading-8 text-gray-600 mb-1">默认值</div>
          <div class="flex items-center space-x-2">
            <button
              class="flex h-9 grow items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
              type="button"
            >
              <UploadIcon class="mr-1.5 h-4 w-4 text-emerald-500" />
              从本地上传
            </button>
            <button
              class="flex h-9 grow items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
              type="button"
            >
              <LinkIcon class="mr-1.5 h-4 w-4 text-emerald-500" />
              粘贴链接
            </button>
          </div>
        </div>
      </template>

      <!-- JSON 配置 -->
      <div v-else-if="selectedType.id === 'json'">
        <div class="font-semibold leading-8 text-gray-600 mb-1 flex items-center">
          JSON Schema
          <span class="ml-1 text-xs font-normal text-gray-400">(可选)</span>
        </div>
        <div
          class="relative rounded-xl border border-emerald-100 bg-emerald-50/20 overflow-hidden font-mono text-[13px] leading-6"
        >
          <div class="flex">
            <div
              class="w-8 shrink-0 bg-emerald-100/30 py-3 text-right text-emerald-400 select-none border-r border-emerald-100 pr-2"
            >
              <div v-for="i in 6" :key="i">
                {{ i }}
              </div>
            </div>
            <div class="p-3 text-gray-600 overflow-x-auto whitespace-pre">
              <span class="text-emerald-600">{</span>
              {'\n'} &nbsp;&nbsp;
              <span class="text-emerald-700 font-bold">"type"</span>
              :
              <span class="text-emerald-600">"object"</span>
              , {'\n'} &nbsp;&nbsp;
              <span class="text-emerald-700 font-bold">"properties"</span>
              :
              <span class="text-emerald-600">{</span>
              {'\n'} &nbsp;&nbsp;&nbsp;&nbsp;
              <span class="text-emerald-400/80 italic">// Add your schema</span>
              {'\n'} &nbsp;&nbsp;
              <span class="text-emerald-600">}</span>
              {'\n'}
              <span class="text-emerald-600">}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 公共底部配置复选框 -->
      <div class="pt-2">
        <label class="flex items-center space-x-2 mb-4 cursor-pointer select-none">
          <input v-model="form.required" type="checkbox" class="hidden" />
          <div
            class="flex h-4 w-4 items-center justify-center rounded border"
            :class="
              form.required
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'border-gray-300 bg-white'
            "
          >
            <CheckIcon v-if="form.required" class="h-3 w-3" stroke-width="3" />
          </div>
          <span class="font-semibold text-gray-700">必填</span>
        </label>

        <div class="flex items-center space-x-2 opacity-60">
          <div
            class="flex h-4 w-4 items-center justify-center rounded border border-gray-200 bg-gray-100"
          />
          <span class="font-semibold text-gray-700">隐藏</span>
        </div>
      </div>
    </div>

    <!-- 底部按钮 -->
    <template #footer>
      <div class="mt-4 flex justify-end gap-3">
        <button
          type="button"
          class="rounded-lg border border-gray-200 bg-white px-5 py-2 font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-4 focus:ring-gray-100 text-xs"
          @click="cancel"
        >
          取消
        </button>
        <button
          type="button"
          class="rounded-lg bg-emerald-600 px-5 py-2 font-medium text-white hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-4 focus:ring-emerald-500/20 shadow-md shadow-emerald-200/50 text-xs"
          @click="confirm"
        >
          保存
        </button>
      </div>
    </template>
  </CenteredDialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import CenteredDialog from '@renderer/views/LuminaApp/Maincontent/OrchestraFlowView/EditorView/Common/CenteredDialog.vue'

interface FieldTypeItem {
  id: string
  name: string
  type: string
  icon: any
}

interface FileCategoryItem {
  id: string
  name: string
  desc: string
  color: string
  icon: any
  selected?: boolean
}

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', payload: { name: string; label: string; type: string; required: boolean }): void
}>()

const visible = ref(props.modelValue)

watch(
  () => props.modelValue,
  (val) => {
    visible.value = val
  }
)

watch(visible, (val) => {
  emit('update:modelValue', val)
})

const form = ref({
  name: '',
  label: '',
  required: true
})

// 图标：用基础 SVG 对应 React 里的 lucide 图标
const TextIcon = {
  template:
    '<svg viewBox="0 0 24 24" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h10M4 17h8"/></svg>'
}
const ParagraphIcon = {
  template:
    '<svg viewBox="0 0 24 24" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4h12M10 4v16"/></svg>'
}
const SelectIcon = {
  template:
    '<svg viewBox="0 0 24 24" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="5" width="16" height="4" rx="1"/><path d="M10 9l2 2 2-2"/></svg>'
}
const NumberIcon = {
  template:
    '<svg viewBox="0 0 24 24" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 4v16M17 4v16M4 9h14M6 15h14"/></svg>'
}
const CheckboxIcon = {
  template:
    '<svg viewBox="0 0 24 24" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12l3 3 5-5"/></svg>'
}
const FileIcon = {
  template:
    '<svg viewBox="0 0 24 24" class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
}
const ImageIcon = {
  template:
    '<svg viewBox="0 0 24 24" class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>'
}
const MusicIcon = {
  template:
    '<svg viewBox="0 0 24 24" class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
}
const VideoIcon = {
  template:
    '<svg viewBox="0 0 24 24" class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="15" height="14" rx="2"/><path d="M18 8l4-3v14l-4-3"/></svg>'
}
const FileQuestionIcon = {
  template:
    '<svg viewBox="0 0 24 24" class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"/><polyline points="14 2 14 8 20 8"/><circle cx="18" cy="18" r="3"/><path d="M18 16v1"/><path d="M18 20h.01"/></svg>'
}
const PlusIcon = {
  template:
    '<svg viewBox="0 0 24 24" class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>'
}
const ChevronDownIcon = {
  template:
    '<svg viewBox="0 0 24 24" class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>'
}
const CheckIcon = {
  template:
    '<svg viewBox="0 0 24 24" class="h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg>'
}
const UploadIcon = {
  template:
    '<svg viewBox="0 0 24 24" class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><polyline points="7 9 12 4 17 9"/><line x1="12" y1="4" x2="12" y2="16"/></svg>'
}
const LinkIcon = {
  template:
    '<svg viewBox="0 0 24 24" class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l1.83-1.83a5 5 0 1 0-7.07-7.07L11 6"/><path d="M14 11a5 5 0 0 0-7.54-.54L4.63 12.3a5 5 0 0 0 7.07 7.07L13 18"/></svg>'
}

const FIELD_TYPES: FieldTypeItem[] = [
  { id: 'text', name: '文本', type: 'string', icon: TextIcon },
  { id: 'paragraph', name: '段落', type: 'string', icon: ParagraphIcon },
  { id: 'select', name: '下拉选项', type: 'string', icon: SelectIcon },
  { id: 'number', name: '数字', type: 'number', icon: NumberIcon },
  { id: 'checkbox', name: '复选框', type: 'boolean', icon: CheckboxIcon },
  { id: 'file', name: '单文件', type: 'file', icon: FileIcon },
  { id: 'file_list', name: '文件列表', type: 'array[file]', icon: FileIcon },
  { id: 'json', name: 'JSON', type: 'object', icon: ParagraphIcon }
]

const FILE_CATEGORIES: FileCategoryItem[] = [
  {
    id: 'doc',
    name: '文档',
    desc: 'TXT, MD, PDF, HTML, DOCX, CSV...',
    icon: FileIcon,
    color: 'text-emerald-400'
  },
  {
    id: 'img',
    name: '图片',
    desc: 'JPG, JPEG, PNG, GIF, WEBP, SVG',
    icon: ImageIcon,
    color: 'text-emerald-500',
    selected: true
  },
  {
    id: 'audio',
    name: '音频',
    desc: 'MP3, M4A, WAV, AMR, MPGA',
    icon: MusicIcon,
    color: 'text-emerald-600'
  },
  {
    id: 'video',
    name: '视频',
    desc: 'MP4, MOV, MPEG, WEBM',
    icon: VideoIcon,
    color: 'text-emerald-700'
  },
  {
    id: 'other',
    name: '其他文件类型',
    desc: '指定其他文件类型',
    icon: FileQuestionIcon,
    color: 'text-gray-400'
  }
]

const selectedType = ref<FieldTypeItem>(FIELD_TYPES[0])
const isTypeDropdownOpen = ref(false)
const typeDropdownRef = ref<HTMLElement | null>(null)
const fileLimit = ref(5)

function toggleTypeDropdown() {
  isTypeDropdownOpen.value = !isTypeDropdownOpen.value
}

function selectType(type: FieldTypeItem) {
  selectedType.value = type
  isTypeDropdownOpen.value = false
}

function handleClickOutside(event: MouseEvent) {
  if (!typeDropdownRef.value) return
  if (!typeDropdownRef.value.contains(event.target as Node)) {
    isTypeDropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})

function resetForm() {
  form.value = {
    name: '',
    label: '',
    required: true
  }
  selectedType.value = FIELD_TYPES[0]
  fileLimit.value = 5
}

function cancel() {
  visible.value = false
}

function confirm() {
  if (!form.value.name.trim()) {
    // 必须有变量名
    return
  }
  emit('confirm', {
    name: form.value.name.trim(),
    label: form.value.label.trim() || form.value.name.trim(),
    type: selectedType.value.type,
    required: form.value.required
  })
  resetForm()
  visible.value = false
}
</script>

<style scoped>
.of-start-node-add-field-dialog {
  font-family: inherit;
}
</style>
