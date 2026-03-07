<template>
  <CenteredDialog
    v-model="visible"
    :title="dialogTitle"
    subtitle="为开始节点配置输入字段"
  >
    <div class="space-y-5">
      <div>
        <div class="mb-1 font-semibold leading-8 text-gray-600">字段类型</div>
        <div ref="typeDropdownRef" class="relative">
          <div
            class="group flex h-10 cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 transition-colors hover:border-emerald-200 hover:bg-emerald-50/30"
            @click="toggleTypeDropdown"
          >
            <div class="flex items-center">
              <svg
                v-if="selectedType.id === 'array'"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="size-4 shrink-0 text-gray-500"
              >
                <path d="M8 6h13M8 12h13M8 18h13" />
                <path d="M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
              <svg
                v-else
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="size-4 shrink-0 text-gray-500"
              >
                <path d="M4 7h16M4 12h10M4 17h8" />
              </svg>
              <span class="ml-2 font-medium text-gray-800">
                {{ selectedType.name }}
              </span>
            </div>
            <div class="flex items-center space-x-2">
              <div
                class="inline-flex h-5 items-center rounded border border-emerald-200/50 bg-emerald-100/50 px-1.5 text-xs font-medium text-emerald-700"
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

          <div
            v-if="isTypeDropdownOpen"
            class="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5"
          >
            <div
              v-for="type in FIELD_TYPES"
              :key="type.id"
              class="flex cursor-pointer items-center justify-between px-3 py-2"
              :class="{ 'bg-emerald-50/60': selectedType.id === type.id }"
              @click="selectType(type)"
            >
              <div class="flex items-center">
                <svg
                  v-if="type.id === 'array'"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  class="size-4 shrink-0"
                  :class="selectedType.id === type.id ? 'text-emerald-600' : 'text-gray-500'"
                >
                  <path d="M8 6h13M8 12h13M8 18h13" />
                  <path d="M3 6h.01M3 12h.01M3 18h.01" />
                </svg>
                <svg
                  v-else
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  class="size-4 shrink-0"
                  :class="selectedType.id === type.id ? 'text-emerald-600' : 'text-gray-500'"
                >
                  <path d="M4 7h16M4 12h10M4 17h8" />
                </svg>
                <span
                  class="ml-2"
                  :class="selectedType.id === type.id ? 'font-medium text-emerald-700' : 'text-gray-700'"
                >
                  {{ type.name }}
                </span>
              </div>
              <div class="inline-flex h-5 items-center rounded border border-gray-100 px-1.5 text-xs text-gray-400">
                {{ type.type }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div class="mb-1 font-semibold leading-8 text-gray-600">变量名称</div>
        <input
          v-model="form.name"
          class="w-full appearance-none rounded-lg border border-transparent bg-gray-50 px-3 py-2 text-gray-800 outline-none transition-all placeholder:text-gray-400 hover:border-emerald-200 hover:bg-emerald-50/20 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
          placeholder="请输入"
        />
      </div>

      <div>
        <div class="mb-1 font-semibold leading-8 text-gray-600">显示名称</div>
        <input
          v-model="form.label"
          class="w-full appearance-none rounded-lg border border-transparent bg-gray-50 px-3 py-2 text-gray-800 outline-none transition-all placeholder:text-gray-400 hover:border-emerald-200 hover:bg-emerald-50/20 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
          placeholder="请输入"
        />
      </div>

      <div v-if="selectedType.id === 'text'">
        <div class="mb-1 font-semibold leading-8 text-gray-600">默认值</div>
        <input
          v-model="textDefaultValue"
          class="w-full appearance-none rounded-lg border border-transparent bg-gray-50 px-3 py-2 text-gray-800 outline-none transition-all placeholder:text-gray-400 hover:border-emerald-200 hover:bg-emerald-50/20 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
          placeholder="可选，运行测试时会自动填充"
        />
      </div>

      <div v-else class="space-y-3">
        <div>
          <div class="mb-1 font-semibold leading-8 text-gray-600">默认列表值</div>
          <div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div class="mb-3 flex items-center justify-between">
              <div class="text-xs text-gray-500">运行测试时的初始列表项</div>
              <button
                type="button"
                class="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-100"
                @click="appendDefaultArrayItem"
              >
                添加项
              </button>
            </div>

            <div v-if="arrayDefaultItems.length === 0" class="text-xs text-gray-400">
              暂无默认值，保存后运行测试时初始为空列表
            </div>

            <div
              v-for="(item, index) in arrayDefaultItems"
              :key="`default-item-${index}`"
              class="mb-2 flex items-center gap-2 last:mb-0"
            >
              <div class="w-8 shrink-0 text-center text-xs text-gray-400">
                {{ index + 1 }}
              </div>
              <input
                :value="item"
                class="flex-1 appearance-none rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                placeholder="请输入默认列表项"
                @input="updateDefaultArrayItem(index, ($event.target as HTMLInputElement).value)"
              />
              <button
                type="button"
                class="rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                @click="removeDefaultArrayItem(index)"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="pt-2">
        <label class="mb-4 flex cursor-pointer select-none items-center space-x-2">
          <input v-model="form.required" type="checkbox" class="hidden" />
          <div
            class="flex h-4 w-4 items-center justify-center rounded border"
            :class="
              form.required
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-gray-300 bg-white'
            "
          >
            <svg
              v-if="form.required"
              viewBox="0 0 24 24"
              class="h-3 w-3"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span class="font-semibold text-gray-700">必填</span>
        </label>
      </div>
    </div>

    <template #footer>
      <div class="mt-4 flex justify-end gap-3">
        <button
          type="button"
          class="rounded-lg border border-gray-200 bg-white px-5 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-100"
          @click="cancel"
        >
          取消
        </button>
        <button
          type="button"
          class="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
          @click="confirm"
        >
          保存
        </button>
      </div>
    </template>
  </CenteredDialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import CenteredDialog from '@renderer/views/LuminaApp/Maincontent/OrchestraFlowView/EditorView/Common/CenteredDialog.vue'
import { OFVarType, type OFVariable } from '@shared/Orchestraflow-types'

interface FieldTypeItem {
  id: 'text' | 'array'
  name: string
  type: string
}

const FIELD_TYPES: FieldTypeItem[] = [
  { id: 'text', name: '文本', type: OFVarType.String },
  { id: 'array', name: '列表', type: OFVarType.Array }
]

const props = defineProps<{
  modelValue: boolean
  initialField?: OFVariable | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (
    e: 'confirm',
    payload: {
      name: string
      label: string
      type: OFVarType.String | OFVarType.Array
      required: boolean
      defaultValue?: string | string[]
    }
  ): void
}>()

const visible = ref(props.modelValue)
const form = ref({
  name: '',
  label: '',
  required: true
})
const selectedType = ref<FieldTypeItem>(FIELD_TYPES[0])
const textDefaultValue = ref('')
const arrayDefaultItems = ref<string[]>([])
const isTypeDropdownOpen = ref(false)
const typeDropdownRef = ref<HTMLElement | null>(null)

const dialogTitle = computed(() => (props.initialField ? '编辑变量' : '添加变量'))

watch(
  () => props.modelValue,
  (val) => {
    visible.value = val
    if (val) {
      hydrateFormFromInitialField()
    }
  }
)

watch(visible, (val) => {
  emit('update:modelValue', val)
})

watch(
  () => props.initialField,
  () => {
    if (visible.value) {
      hydrateFormFromInitialField()
    }
  }
)

function hydrateFormFromInitialField() {
  const field = props.initialField
  const nextType = field?.type === OFVarType.Array ? FIELD_TYPES[1] : FIELD_TYPES[0]
  selectedType.value = nextType
  form.value = {
    name: field?.variable || '',
    label: field?.label || '',
    required: field?.required ?? true
  }
  textDefaultValue.value =
    typeof field?.default === 'string' ? field.default : field?.default == null ? '' : String(field.default)
  arrayDefaultItems.value = Array.isArray(field?.default)
    ? field.default.map((item) => (typeof item === 'string' ? item : String(item)))
    : []
}

function resetForm() {
  form.value = {
    name: '',
    label: '',
    required: true
  }
  selectedType.value = FIELD_TYPES[0]
  textDefaultValue.value = ''
  arrayDefaultItems.value = []
  isTypeDropdownOpen.value = false
}

function toggleTypeDropdown() {
  isTypeDropdownOpen.value = !isTypeDropdownOpen.value
}

function selectType(type: FieldTypeItem) {
  selectedType.value = type
  isTypeDropdownOpen.value = false
  if (type.id === 'text') {
    arrayDefaultItems.value = []
  } else {
    textDefaultValue.value = ''
  }
}

function handleClickOutside(event: MouseEvent) {
  if (!typeDropdownRef.value) return
  if (!typeDropdownRef.value.contains(event.target as Node)) {
    isTypeDropdownOpen.value = false
  }
}

function appendDefaultArrayItem() {
  arrayDefaultItems.value = [...arrayDefaultItems.value, '']
}

function updateDefaultArrayItem(index: number, value: string) {
  const nextItems = [...arrayDefaultItems.value]
  nextItems[index] = value
  arrayDefaultItems.value = nextItems
}

function removeDefaultArrayItem(index: number) {
  const nextItems = [...arrayDefaultItems.value]
  nextItems.splice(index, 1)
  arrayDefaultItems.value = nextItems
}

function cancel() {
  visible.value = false
}

function confirm() {
  const name = form.value.name.trim()
  if (!name) return

  emit('confirm', {
    name,
    label: form.value.label.trim() || name,
    type: selectedType.value.type as OFVarType.String | OFVarType.Array,
    required: form.value.required,
    defaultValue:
      selectedType.value.id === 'array' ? [...arrayDefaultItems.value] : textDefaultValue.value
  })

  resetForm()
  visible.value = false
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})

hydrateFormFromInitialField()
</script>
