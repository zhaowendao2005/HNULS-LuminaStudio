<template>
  <div class="border-b border-b-gray-200 border-l-2 py-2.5 pl-3" :class="levelTone.borderClass">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
          <input
            :value="field.name"
            class="min-w-[96px] bg-transparent px-0 text-[13px] font-semibold leading-[18px] text-gray-900 outline-none placeholder:text-gray-400"
            placeholder="字段名"
            @input="emitPatch({ name: ($event.target as HTMLInputElement).value })"
          />

          <div class="flex items-center gap-1 text-[10px] uppercase tracking-[0.12em]">
            <span class="text-gray-500">类型:</span>
            <button
              v-for="option in typeOptions"
              :key="String(option.value)"
              type="button"
              class="transition-colors"
              :class="typeTextClass(option.value as StartSchemaDraftType)"
              @click="handleTypeChange(option.value)"
            >
              {{ option.label }}
            </button>
          </div>

          <button
            type="button"
            class="text-xs leading-none transition-colors"
            :class="field.required ? 'text-rose-500' : 'text-gray-400 hover:text-gray-600'"
            @click="emitPatch({ required: !field.required })"
          >
            *
          </button>
        </div>

        <div class="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs leading-4">
          <button
            v-if="field.type === 'boolean'"
            type="button"
            class="rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors"
            :class="field.default === true ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:text-emerald-700'"
            @click="emitPatch({ default: true })"
          >
            TRUE
          </button>
          <button
            v-if="field.type === 'boolean'"
            type="button"
            class="rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors"
            :class="field.default === false ? 'bg-rose-50 text-rose-700' : 'text-gray-500 hover:text-rose-700'"
            @click="emitPatch({ default: false })"
          >
            FALSE
          </button>

          <input
            v-if="field.type === 'string'"
            :value="stringDefaultValue"
            class="min-w-[120px] bg-transparent px-0 text-xs text-sky-700 outline-none placeholder:text-gray-400"
            placeholder="默认值"
            @input="emitPatch({ default: ($event.target as HTMLInputElement).value || undefined })"
          />

          <input
            v-else-if="field.type === 'number'"
            :value="numberDefaultValue"
            type="number"
            class="min-w-[80px] bg-transparent px-0 text-xs text-sky-700 outline-none placeholder:text-gray-400"
            placeholder="默认值"
            @input="handleNumberDefaultInput"
          />

          <input
            :value="field.description || ''"
            class="min-w-[160px] flex-1 bg-transparent px-0 text-xs text-gray-500 outline-none placeholder:text-gray-400"
            placeholder="字段描述"
            @input="emitPatch({ description: ($event.target as HTMLInputElement).value })"
          />

          <div
            v-if="field.type === 'object' || field.type === 'array'"
            class="text-[10px] uppercase tracking-[0.12em]"
            :class="levelTone.labelClass"
          >
            {{ field.type === 'array' ? '类型: {}[]' : '类型: {}' }}
          </div>
        </div>

        <div v-if="field.type === 'object' || field.type === 'array'" class="mt-1.5 pl-3">
          <div class="space-y-0">
            <StartNodeSchemaFieldEditor
              v-for="child in nestedFields"
              :key="child.id"
              :field="child"
              :level="level + 1"
              @patch="updateChild(child.id, $event)"
              @remove="removeChild(child.id)"
            />
          </div>

          <button
            type="button"
            class="mt-1.5 inline-flex items-center gap-1 px-0 py-0.5 text-xs font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
            @click="addChild"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="currentColor">
              <path d="M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z" />
            </svg>
            <span>添加子字段</span>
          </button>
        </div>
      </div>

      <button
        type="button"
        class="shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
        @click="$emit('remove')"
      >
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
          <path
            d="M17 6H22V8H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V8H2V6H7V3C7 2.44772 7.44772 2 8 2H16C16.5523 2 17 2.44772 17 3V6ZM18 8H6V20H18V8ZM9 11H11V17H9V11ZM13 11H15V17H13V11ZM9 4V6H15V4H9Z"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type StartSchemaDraftType = 'string' | 'number' | 'boolean' | 'object' | 'array'

export interface StartSchemaDraftField {
  id: string
  name: string
  type: StartSchemaDraftType
  required: boolean
  description?: string
  default?: string | number | boolean | Record<string, any> | any[] | null
  children?: StartSchemaDraftField[]
}

const props = defineProps<{
  field: StartSchemaDraftField
  level?: number
}>()

const emit = defineEmits<{
  patch: [patch: Partial<StartSchemaDraftField>]
  remove: []
}>()

const typeOptions = [
  { label: 'string', value: 'string' },
  { label: 'number', value: 'number' },
  { label: 'boolean', value: 'boolean' },
  { label: 'object', value: 'object' },
  { label: 'array', value: 'array' }
]

const nestedFields = computed(() => props.field.children || [])
const stringDefaultValue = computed(() => (typeof props.field.default === 'string' ? props.field.default : ''))
const numberDefaultValue = computed(() =>
  typeof props.field.default === 'number' && Number.isFinite(props.field.default) ? String(props.field.default) : ''
)
const level = computed(() => props.level ?? 0)
const levelTone = computed(() => {
  const tones = [
    {
      borderClass: 'border-l-emerald-400',
      labelClass: 'text-emerald-600'
    },
    {
      borderClass: 'border-l-cyan-400',
      labelClass: 'text-cyan-600'
    },
    {
      borderClass: 'border-l-violet-400',
      labelClass: 'text-violet-600'
    },
    {
      borderClass: 'border-l-amber-400',
      labelClass: 'text-amber-600'
    }
  ]
  return tones[level.value % tones.length]
})

function createField(type: StartSchemaDraftType = 'string'): StartSchemaDraftField {
  return {
    id: `start_schema_field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    type,
    required: true,
    description: '',
    default: type === 'object' ? {} : type === 'array' ? [] : undefined,
    children: type === 'object' || type === 'array' ? [] : undefined
  }
}

function emitPatch(patch: Partial<StartSchemaDraftField>) {
  emit('patch', patch)
}

function handleTypeChange(value: string | number | null) {
  const nextType = String(value || 'string') as StartSchemaDraftType
  emitPatch({
    type: nextType,
    default:
      nextType === 'object'
        ? {}
        : nextType === 'array'
          ? []
          : nextType === 'boolean'
            ? false
            : undefined,
    children: nextType === 'object' || nextType === 'array' ? props.field.children || [] : undefined
  })
}

function typeTextClass(type: StartSchemaDraftType) {
  const active = props.field.type === type
  if (type === 'string') return active ? 'text-sky-700' : 'text-gray-400 hover:text-sky-600'
  if (type === 'number') return active ? 'text-violet-700' : 'text-gray-400 hover:text-violet-600'
  if (type === 'boolean') return active ? 'text-rose-700' : 'text-gray-400 hover:text-rose-600'
  if (type === 'object') return active ? levelTone.value.labelClass : 'text-gray-400 hover:text-emerald-600'
  return active ? 'text-cyan-700' : 'text-gray-400 hover:text-cyan-600'
}

function handleNumberDefaultInput(event: Event) {
  const raw = (event.target as HTMLInputElement).value.trim()
  emitPatch({ default: raw ? Number(raw) : undefined })
}

function addChild() {
  emitPatch({ children: [...nestedFields.value, createField('string')] })
}

function updateChild(childId: string, patch: Partial<StartSchemaDraftField>) {
  emitPatch({
    children: nestedFields.value.map((child) => (child.id === childId ? { ...child, ...patch } : child))
  })
}

function removeChild(childId: string) {
  emitPatch({
    children: nestedFields.value.filter((child) => child.id !== childId)
  })
}
</script>
