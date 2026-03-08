<template>
  <CenteredDialog
    :model-value="modelValue"
    title="开始节点 Schema"
    subtitle="默认值跟随 Schema 一起配置，支持对象嵌套对象"
    :close-on-mask="true"
    max-width="1180px"
    @update:model-value="handleVisibleChange"
  >
    <div class="relative flex h-[800px] min-h-[800px] flex-col">
      <Transition name="start-schema-toast">
        <div
          v-if="toastMessage"
          class="pointer-events-none absolute left-1/2 top-3 z-20 w-[min(520px,calc(100%-32px))] -translate-x-1/2"
        >
          <div
            class="mx-auto rounded-[24px] border border-white/70 bg-black/92 px-5 py-3 text-center text-sm text-white shadow-[0_18px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl"
          >
            {{ toastMessage }}
          </div>
        </div>
      </Transition>

      <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div class="inline-flex gap-1">
          <button
            class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all"
            :class="
              activeTab === 'visual'
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-gray-500 hover:text-gray-800'
            "
            @click="activeTab = 'visual'"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="currentColor">
              <path d="M3 3H10V10H3V3ZM3 14H10V21H3V14ZM14 3H21V10H14V3ZM14 14H21V21H14V14Z" />
            </svg>
            <span>Visual Editor</span>
          </button>
          <button
            class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all"
            :class="
              activeTab === 'json' ? 'bg-sky-50 text-sky-700' : 'text-gray-500 hover:text-gray-800'
            "
            @click="activeTab = 'json'"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="currentColor">
              <path
                d="M8.414 8L3.707 12.707L2.293 11.293L5.586 8L2.293 4.707L3.707 3.293L8.414 8ZM11 19H21V21H11V19Z"
              />
            </svg>
            <span>{ } JSON Schema</span>
          </button>
        </div>

        <div class="flex items-center gap-2 text-xs">
          <span class="text-gray-600">Root</span>
          <button
            type="button"
            class="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-cyan-700"
            disabled
          >
            {{ rootType }}
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-auto bg-white px-4 py-4">
        <div v-if="activeTab === 'visual'" class="mx-auto max-w-5xl">
          <div class="flex items-center gap-2 pb-2">
            <span class="system-sm-semibold-uppercase text-gray-700">start_input</span>
            <span class="text-xs text-gray-500">{{ rootType }}</span>
          </div>

          <StartNodeSchemaFieldEditor
            v-for="field in fields"
            :key="field.id"
            :field="field"
            :level="0"
            @patch="updateField(field.id, $event)"
            @remove="removeField(field.id)"
          />

          <button
            type="button"
            class="mt-2 inline-flex items-center gap-1 px-0 py-1.5 text-xs font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
            @click="addField('string')"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="currentColor">
              <path d="M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z" />
            </svg>
            <span>添加字段</span>
          </button>
        </div>

        <div
          v-else
          class="relative flex h-full overflow-hidden rounded-2xl border border-gray-200 bg-white font-mono text-xs"
        >
          <div
            class="min-h-full select-none border-r border-gray-200 bg-slate-50 px-3 py-3 text-right text-gray-400"
          >
            <div v-for="lineNo in lineNumbers" :key="lineNo">{{ lineNo }}</div>
          </div>

          <textarea
            v-model="jsonDraft"
            class="h-full w-full flex-1 resize-none bg-transparent p-3 leading-relaxed text-gray-800 outline-none"
            spellcheck="false"
          />
        </div>
      </div>

      <div class="flex items-center justify-between border-t border-gray-100 bg-white px-4 py-3">
        <button
          type="button"
          class="text-xs text-gray-500 transition-colors hover:text-gray-800"
          @click="resetFields"
        >
          清空配置
        </button>

        <div class="flex items-center gap-2.5">
          <button
            type="button"
            class="text-xs text-gray-500 transition-colors hover:text-gray-800"
            @click="emit('update:modelValue', false)"
          >
            取消
          </button>
          <button
            type="button"
            class="rounded-full bg-emerald-600 px-5 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
            @click="handleSave"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  </CenteredDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { OFJsonSchemaProperty, OFStructuredJsonSchema } from '@shared/Orchestraflow-types'
import CenteredDialog from '@renderer/views/LuminaApp/Maincontent/OrchestraFlowView/EditorView/Common/CenteredDialog.vue'
import type { OFSchemaRootType } from '@renderer/stores/orchestraflow/workflow-editor/object-schema-editor/object-schema-editor.types'
import StartNodeSchemaFieldEditor, {
  type StartSchemaDraftField,
  type StartSchemaDraftType
} from './StartNodeSchemaFieldEditor.vue'

const props = defineProps<{
  modelValue: boolean
  schema: OFStructuredJsonSchema | null
  rootType: OFSchemaRootType
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [schema: OFStructuredJsonSchema]
}>()

const activeTab = ref<'visual' | 'json'>('visual')
const jsonDraft = ref('')
const fields = ref<StartSchemaDraftField[]>([])
const toastMessage = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

const currentSchema = computed(() => fieldsToSchema(fields.value, props.rootType))
const lineNumbers = computed(() =>
  (activeTab.value === 'json' ? jsonDraft.value : JSON.stringify(currentSchema.value, null, 2))
    .split('\n')
    .map((_, index) => index + 1)
)
const parsedJsonSchema = computed(() => {
  try {
    const parsed = JSON.parse(jsonDraft.value || '{}') as OFStructuredJsonSchema
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    if (props.rootType === 'object' && parsed.type !== 'object') return null
    if (props.rootType === 'array<object>' && parsed.type !== 'array') return null
    return parsed
  } catch {
    return null
  }
})

watch(
  () => [props.modelValue, props.schema] as const,
  ([visible, schema]) => {
    if (!visible) return
    fields.value = schemaToFields(schema, props.rootType)
    if (!fields.value.length) fields.value = [createField('string')]
    jsonDraft.value = JSON.stringify(schema || currentSchema.value, null, 2)
    activeTab.value = 'visual'
  },
  { immediate: true }
)

watch(
  currentSchema,
  (value) => {
    if (activeTab.value === 'visual') {
      jsonDraft.value = JSON.stringify(value, null, 2)
    }
  },
  { deep: true }
)

watch(activeTab, (nextTab, prevTab) => {
  if (prevTab === 'json' && nextTab === 'visual') {
    if (!parsedJsonSchema.value) {
      showToast('JSON Schema 格式无效，无法切回可视化编辑')
      activeTab.value = 'json'
      return
    }
    fields.value = schemaToFields(parsedJsonSchema.value, props.rootType)
    if (!fields.value.length) fields.value = [createField('string')]
  }
  if (nextTab === 'json') {
    jsonDraft.value = JSON.stringify(currentSchema.value, null, 2)
  }
})

function createField(type: StartSchemaDraftType = 'string'): StartSchemaDraftField {
  return {
    id: `start_schema_field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    type,
    required: true,
    description: '',
    default:
      type === 'object' ? {} : type === 'array' ? [] : type === 'boolean' ? false : undefined,
    children: type === 'object' || type === 'array' ? [] : undefined
  }
}

function schemaNodeToField(
  name: string,
  schema: OFJsonSchemaProperty,
  required: boolean
): StartSchemaDraftField {
  return {
    id: `start_schema_field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    type: schema.type,
    required,
    description: schema.description,
    default: (schema as any).default,
    children:
      schema.type === 'object'
        ? Object.entries(schema.properties || {}).map(([childName, childSchema]) =>
            schemaNodeToField(childName, childSchema, new Set(schema.required || []).has(childName))
          )
        : schema.type === 'array' && schema.items.type === 'object'
          ? Object.entries(schema.items.properties || {}).map(([childName, childSchema]) =>
              schemaNodeToField(
                childName,
                childSchema,
                new Set(schema.items.required || []).has(childName)
              )
            )
          : []
  }
}

function schemaToFields(
  schema: OFStructuredJsonSchema | null,
  rootType: OFSchemaRootType
): StartSchemaDraftField[] {
  if (!schema) return []
  if (rootType === 'object' && schema.type === 'object') {
    const requiredSet = new Set(schema.required || [])
    return Object.entries(schema.properties || {}).map(([name, value]) =>
      schemaNodeToField(name, value, requiredSet.has(name))
    )
  }
  if (rootType === 'array<object>' && schema.type === 'array' && schema.items.type === 'object') {
    const requiredSet = new Set(schema.items.required || [])
    return Object.entries(schema.items.properties || {}).map(([name, value]) =>
      schemaNodeToField(name, value, requiredSet.has(name))
    )
  }
  return []
}

function fieldToSchemaNode(field: StartSchemaDraftField): OFJsonSchemaProperty {
  if (field.type === 'object') {
    const properties = Object.fromEntries(
      (field.children || []).map((child) => [child.name.trim(), fieldToSchemaNode(child)])
    )
    return {
      type: 'object',
      properties,
      required: (field.children || [])
        .filter((child) => child.required)
        .map((child) => child.name.trim()),
      additionalProperties: false,
      description: field.description?.trim() || undefined,
      default:
        field.default && typeof field.default === 'object' && !Array.isArray(field.default)
          ? field.default
          : undefined
    }
  }

  if (field.type === 'array') {
    const itemObject = {
      type: 'object' as const,
      properties: Object.fromEntries(
        (field.children || []).map((child) => [child.name.trim(), fieldToSchemaNode(child)])
      ),
      required: (field.children || [])
        .filter((child) => child.required)
        .map((child) => child.name.trim()),
      additionalProperties: false
    }
    return {
      type: 'array',
      items: itemObject,
      description: field.description?.trim() || undefined,
      default: Array.isArray(field.default) ? field.default : undefined
    }
  }

  return {
    type: field.type,
    description: field.description?.trim() || undefined,
    default:
      field.default === '' || field.default === undefined
        ? undefined
        : (field.default as string | number | boolean | null)
  }
}

function fieldsToSchema(
  drafts: StartSchemaDraftField[],
  rootType: OFSchemaRootType
): OFStructuredJsonSchema {
  const normalized = drafts.filter((field) => field.name.trim())
  const objectSchema = {
    type: 'object' as const,
    properties: Object.fromEntries(
      normalized.map((field) => [field.name.trim(), fieldToSchemaNode(field)])
    ),
    required: normalized.filter((field) => field.required).map((field) => field.name.trim()),
    additionalProperties: false
  }

  if (rootType === 'array<object>') {
    return {
      type: 'array',
      items: objectSchema
    }
  }

  return objectSchema
}

function validateField(field: StartSchemaDraftField, path = field.name || '未命名字段'): string[] {
  const errors: string[] = []

  if (!field.name.trim()) {
    errors.push('字段名不能为空')
  }

  if ((field.type === 'object' || field.type === 'array') && !(field.children || []).length) {
    errors.push(`"${path}" 需要至少一个子字段`)
  }

  const childNames = (field.children || []).map((child) => child.name.trim()).filter(Boolean)
  const duplicated = childNames.filter((name, index) => childNames.indexOf(name) !== index)
  if (duplicated.length) {
    errors.push(`"${path}" 存在重名字段：${[...new Set(duplicated)].join('、')}`)
  }

  for (const child of field.children || []) {
    errors.push(...validateField(child, `${path}.${child.name || '未命名字段'}`))
  }

  return errors
}

function validateDrafts(drafts: StartSchemaDraftField[]): string[] {
  const errors: string[] = []
  const names = drafts.map((field) => field.name.trim()).filter(Boolean)
  const duplicated = names.filter((name, index) => names.indexOf(name) !== index)

  if (!drafts.length) {
    errors.push('至少需要一个字段')
  }
  if (duplicated.length) {
    errors.push(`存在重名字段：${[...new Set(duplicated)].join('、')}`)
  }
  for (const field of drafts) {
    errors.push(...validateField(field))
  }

  return [...new Set(errors)]
}

function showToast(message: string) {
  toastMessage.value = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
    toastTimer = null
  }, 2600)
}

function addField(type: StartSchemaDraftType = 'string') {
  fields.value = [...fields.value, createField(type)]
}

function removeField(fieldId: string) {
  fields.value = fields.value.filter((field) => field.id !== fieldId)
}

function updateField(fieldId: string, patch: Partial<StartSchemaDraftField>) {
  fields.value = fields.value.map((field) =>
    field.id === fieldId ? { ...field, ...patch } : field
  )
}

function resetFields() {
  fields.value = [createField('string')]
}

function handleVisibleChange(visible: boolean) {
  emit('update:modelValue', visible)
}

function handleSave() {
  if (activeTab.value === 'json') {
    if (!parsedJsonSchema.value) {
      showToast('JSON Schema 格式无效，无法保存')
      return
    }
    emit('save', parsedJsonSchema.value)
    emit('update:modelValue', false)
    return
  }

  const errors = validateDrafts(fields.value)
  if (errors.length > 0) {
    showToast(errors[0])
    return
  }

  emit('save', currentSchema.value)
  emit('update:modelValue', false)
}
</script>

<style scoped>
.start-schema-toast-enter-active,
.start-schema-toast-leave-active {
  transition:
    opacity 220ms ease,
    transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

.start-schema-toast-enter-from,
.start-schema-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -16px) scale(0.96);
}

.start-schema-toast-enter-to,
.start-schema-toast-leave-from {
  opacity: 1;
  transform: translate(-50%, 0) scale(1);
}
</style>
