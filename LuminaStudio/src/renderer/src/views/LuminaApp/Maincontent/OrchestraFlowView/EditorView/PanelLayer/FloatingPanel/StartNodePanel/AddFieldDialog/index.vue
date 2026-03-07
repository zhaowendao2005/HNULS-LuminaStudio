<template>
  <CenteredDialog v-model="visible" :title="dialogTitle" subtitle="为开始节点配置输入字段">
    <div class="space-y-5">
      <div class="space-y-1">
        <div class="font-semibold leading-8 text-gray-600">字段类型</div>
        <WhiteSelect
          :model-value="selectedType"
          :options="fieldTypeOptions"
          root-class="w-full"
          trigger-class="!h-10 !rounded-lg !border-gray-200 !bg-gray-50 !px-3 !text-sm !text-gray-800"
          panel-class="min-w-[180px]"
          teleport-to="body"
          @update:model-value="handleTypeChange"
        />
      </div>

      <div class="space-y-1">
        <div class="font-semibold leading-8 text-gray-600">变量名称</div>
        <input
          v-model="form.name"
          class="w-full appearance-none rounded-lg border border-transparent bg-gray-50 px-3 py-2 text-gray-800 outline-none transition-all placeholder:text-gray-400 hover:border-emerald-200 hover:bg-emerald-50/20 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
          placeholder="请输入变量名称"
        />
      </div>

      <div class="space-y-1">
        <div class="font-semibold leading-8 text-gray-600">显示名称</div>
        <input
          v-model="form.label"
          class="w-full appearance-none rounded-lg border border-transparent bg-gray-50 px-3 py-2 text-gray-800 outline-none transition-all placeholder:text-gray-400 hover:border-emerald-200 hover:bg-emerald-50/20 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
          placeholder="请输入显示名称"
        />
      </div>

      <div class="space-y-1">
        <div class="font-semibold leading-8 text-gray-600">字段描述</div>
        <textarea
          v-model="form.description"
          rows="2"
          class="w-full appearance-none rounded-lg border border-transparent bg-gray-50 px-3 py-2 text-gray-800 outline-none transition-all placeholder:text-gray-400 hover:border-emerald-200 hover:bg-emerald-50/20 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
          placeholder="用于运行输入面板提示"
        />
      </div>

      <div v-if="selectedType === OFVarType.Boolean" class="space-y-1">
        <div class="font-semibold leading-8 text-gray-600">默认值</div>
        <div class="inline-flex h-10 items-center overflow-hidden rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
          <button
            type="button"
            class="min-w-[72px] rounded-[6px] px-3 text-sm font-medium leading-9 transition"
            :class="booleanDefaultValue === true ? 'bg-green-50 text-green-700 shadow-sm' : 'text-gray-400'"
            @click="booleanDefaultValue = true"
          >
            TRUE
          </button>
          <button
            type="button"
            class="min-w-[72px] rounded-[6px] px-3 text-sm font-medium leading-9 transition"
            :class="booleanDefaultValue === false ? 'bg-rose-50 text-rose-700 shadow-sm' : 'text-gray-400'"
            @click="booleanDefaultValue = false"
          >
            FALSE
          </button>
        </div>
      </div>

      <div v-else-if="selectedType === OFVarType.Number" class="space-y-1">
        <div class="font-semibold leading-8 text-gray-600">默认值</div>
        <input
          v-model="numberDefaultValue"
          type="number"
          class="w-full appearance-none rounded-lg border border-transparent bg-gray-50 px-3 py-2 text-gray-800 outline-none transition-all placeholder:text-gray-400 hover:border-emerald-200 hover:bg-emerald-50/20 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
          placeholder="可选，运行时会自动填充"
        />
      </div>

      <div v-else-if="isJsonType" class="space-y-3">
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <div class="font-semibold leading-8 text-gray-600">JSON Schema</div>
            <button
              type="button"
              class="rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100"
              @click="openSchemaEditor"
            >
              配置 Schema
            </button>
          </div>
          <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
            {{ schemaSummary }}
          </div>
        </div>

        <div class="space-y-1">
          <div class="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-700">
            默认值请在 Schema 编辑器内部配置。
          </div>
        </div>
      </div>

      <div v-else class="space-y-1">
        <div class="font-semibold leading-8 text-gray-600">默认值</div>
        <input
          v-model="textDefaultValue"
          class="w-full appearance-none rounded-lg border border-transparent bg-gray-50 px-3 py-2 text-gray-800 outline-none transition-all placeholder:text-gray-400 hover:border-emerald-200 hover:bg-emerald-50/20 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
          placeholder="可选，运行时会自动填充"
        />
      </div>

      <div class="pt-2">
        <label class="mb-4 flex cursor-pointer select-none items-center space-x-2">
          <input v-model="form.required" type="checkbox" class="hidden" />
          <div
            class="flex h-4 w-4 items-center justify-center rounded border"
            :class="form.required ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300 bg-white'"
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

      <div v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
        {{ errorMessage }}
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

  <StartNodeSchemaEditor
    v-model="schemaEditorVisible"
    :schema="currentSchema"
    :root-type="schemaEditorRootType"
    @save="handleSchemaSave"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CenteredDialog from '@renderer/views/LuminaApp/Maincontent/OrchestraFlowView/EditorView/Common/CenteredDialog.vue'
import WhiteSelect, { type WhiteSelectOption } from '@renderer/views/LuminaApp/Maincontent/NormalChat/components/WhiteSelect.vue'
import StartNodeSchemaEditor from '../StartNodeSchemaEditor/index.vue'
import type { OFStructuredJsonSchema, OFVariable } from '@shared/Orchestraflow-types'
import { OFVarType } from '@shared/Orchestraflow-types'
import type { OFSchemaRootType } from '@renderer/stores/orchestraflow/workflow-editor/object-schema-editor/object-schema-editor.types'

const fieldTypeOptions: WhiteSelectOption[] = [
  { label: 'string', value: OFVarType.String },
  { label: 'number', value: OFVarType.Number },
  { label: 'boolean', value: OFVarType.Boolean },
  { label: 'object', value: OFVarType.Object },
  { label: 'array', value: OFVarType.Array }
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
      type: OFVarType
      required: boolean
      description?: string
      defaultValue?: string | number | boolean | Record<string, any> | any[] | null
      schema?: OFStructuredJsonSchema | null
    }
  ): void
}>()

const visible = ref(props.modelValue)
const form = ref({
  name: '',
  label: '',
  description: '',
  required: true
})
const selectedType = ref<OFVarType>(OFVarType.String)
const textDefaultValue = ref('')
const numberDefaultValue = ref('')
const booleanDefaultValue = ref<boolean>(true)
const currentSchema = ref<OFStructuredJsonSchema | null>(null)
const errorMessage = ref('')
const schemaEditorVisible = ref(false)

const dialogTitle = computed(() => (props.initialField ? '编辑变量' : '添加变量'))
const isJsonType = computed(
  () => selectedType.value === OFVarType.Object || selectedType.value === OFVarType.Array
)
const schemaEditorRootType = computed<OFSchemaRootType>(() =>
  selectedType.value === OFVarType.Array ? 'array<object>' : 'object'
)
const schemaSummary = computed(() => {
  if (!currentSchema.value) return '必须先配置 Schema，object/array 字段才允许保存。'
  return JSON.stringify(currentSchema.value, null, 2)
})

watch(
  () => props.modelValue,
  (value) => {
    visible.value = value
    if (value) {
      hydrateFormFromInitialField()
    }
  },
  { immediate: true }
)

watch(visible, (value) => {
  emit('update:modelValue', value)
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
  selectedType.value = (field?.type as OFVarType) || OFVarType.String
  form.value = {
    name: field?.variable || '',
    label: field?.label || '',
    description: field?.description || '',
    required: field?.required ?? true
  }
  currentSchema.value = field?.schema || null
  errorMessage.value = ''

  textDefaultValue.value = typeof field?.default === 'string' ? field.default : ''
  numberDefaultValue.value =
    typeof field?.default === 'number' && Number.isFinite(field.default) ? String(field.default) : ''
  booleanDefaultValue.value = typeof field?.default === 'boolean' ? field.default : true
}

function resetForm() {
  form.value = {
    name: '',
    label: '',
    description: '',
    required: true
  }
  selectedType.value = OFVarType.String
  textDefaultValue.value = ''
  numberDefaultValue.value = ''
  booleanDefaultValue.value = true
  currentSchema.value = null
  errorMessage.value = ''
  schemaEditorVisible.value = false
}

function handleTypeChange(value: string | number | null) {
  const previousType = selectedType.value
  selectedType.value = String(value || OFVarType.String) as OFVarType
  errorMessage.value = ''
  if (!isJsonType.value) {
    currentSchema.value = null
    return
  }

  if (
    (previousType === OFVarType.Array && selectedType.value === OFVarType.Object) ||
    (previousType === OFVarType.Object && selectedType.value === OFVarType.Array)
  ) {
    currentSchema.value = null
  }
}

function openSchemaEditor() {
  schemaEditorVisible.value = true
}

function handleSchemaSave(schema: OFStructuredJsonSchema) {
  currentSchema.value = schema
}

function cancel() {
  visible.value = false
}

function confirm() {
  const name = form.value.name.trim()
  if (!name) {
    errorMessage.value = '变量名称不能为空'
    return
  }
  if (isJsonType.value && !currentSchema.value) {
    errorMessage.value = 'object / array 类型必须先配置 Schema'
    return
  }

  try {
    emit('confirm', {
      name,
      label: form.value.label.trim() || name,
      type: selectedType.value,
      required: form.value.required,
      description: form.value.description.trim() || undefined,
      defaultValue: buildDefaultValue(),
      schema: isJsonType.value ? currentSchema.value : null
    })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '默认值格式无效'
    return
  }

  resetForm()
  visible.value = false
}

function buildDefaultValue() {
  switch (selectedType.value) {
    case OFVarType.Number:
      return numberDefaultValue.value.trim() ? Number(numberDefaultValue.value.trim()) : undefined
    case OFVarType.Boolean:
      return booleanDefaultValue.value
    case OFVarType.Object:
    case OFVarType.Array:
      return currentSchema.value?.default
    case OFVarType.String:
    default:
      return textDefaultValue.value || undefined
  }
}
</script>
