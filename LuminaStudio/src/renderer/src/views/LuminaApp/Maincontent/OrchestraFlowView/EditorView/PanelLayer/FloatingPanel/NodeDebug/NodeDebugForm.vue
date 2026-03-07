<template>
  <div class="space-y-3">
    <div class="text-xs text-gray-500">字段配置</div>

    <div
      v-if="fields.length === 0"
      class="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-400"
    >
      当前节点无需额外入参。
    </div>

    <div v-for="field in fields" :key="field.key" class="space-y-1">
      <label class="text-xs font-medium text-gray-600">
        {{ field.label }}
        <span v-if="field.required" class="text-red-500">*</span>
      </label>

      <textarea
        v-if="isJsonField(field)"
        :value="getDisplayValue(field)"
        rows="4"
        class="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 font-mono text-sm outline-none focus:border-emerald-400"
        :placeholder="field.placeholder || getJsonPlaceholder(field)"
        @input="onInput(field.key, ($event.target as HTMLTextAreaElement).value)"
      />

      <button
        v-else-if="isBooleanField(field)"
        type="button"
        class="inline-flex h-8 max-w-full items-center overflow-hidden rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm"
      >
        <span
          class="min-w-[54px] rounded-[5px] px-2 text-center text-xs font-semibold leading-7 transition"
          :class="props.modelValue[field.key] === true ? 'bg-green-50 text-green-700 shadow-sm' : 'text-gray-400'"
          @click="onBooleanInput(field.key, true)"
        >
          TRUE
        </span>
        <span
          class="min-w-[54px] rounded-[5px] px-2 text-center text-xs font-semibold leading-7 transition"
          :class="props.modelValue[field.key] === false ? 'bg-rose-50 text-rose-700 shadow-sm' : 'text-gray-400'"
          @click="onBooleanInput(field.key, false)"
        >
          FALSE
        </span>
      </button>

      <input
        v-else
        :value="getDisplayValue(field)"
        :type="isNumberField(field) ? 'number' : 'text'"
        class="h-8 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm outline-none focus:border-emerald-400"
        :placeholder="field.placeholder || '请输入'"
        @input="onInput(field.key, ($event.target as HTMLInputElement).value)"
      />

      <details
        v-if="isJsonField(field) && field.schema"
        class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500"
      >
        <summary class="cursor-pointer select-none text-gray-600">JSON Schema 提示</summary>
        <pre class="mt-2 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-5 text-gray-500">{{ formatSchema(field.schema) }}</pre>
      </details>
    </div>

    <div
      v-if="errors.length > 0"
      class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600"
    >
      <div v-for="item in errors" :key="item">{{ item }}</div>
    </div>

    <button
      class="mt-2 w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="running"
      @click="handleExecute"
    >
      {{ running ? '执行中...' : '执行' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { OFVarType, type OFStructuredJsonSchema } from '@shared/Orchestraflow-types'

export interface NodeDebugField {
  key: string
  label: string
  type?: OFVarType | string
  required?: boolean
  placeholder?: string
  schema?: OFStructuredJsonSchema | null
}

const props = defineProps<{
  fields: NodeDebugField[]
  modelValue: Record<string, any>
  running?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [Record<string, any>]
  execute: [Record<string, any>]
}>()

const errors = ref<string[]>([])

function onInput(key: string, value: string) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value
  })
}

function onBooleanInput(key: string, value: boolean) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value
  })
}

function isArrayField(field: NodeDebugField): boolean {
  return field.type === OFVarType.Array || field.type === 'array'
}

function isObjectField(field: NodeDebugField): boolean {
  return field.type === OFVarType.Object || field.type === 'object'
}

function isJsonField(field: NodeDebugField): boolean {
  return isArrayField(field) || isObjectField(field)
}

function isNumberField(field: NodeDebugField): boolean {
  return field.type === OFVarType.Number || field.type === 'number'
}

function isBooleanField(field: NodeDebugField): boolean {
  return field.type === OFVarType.Boolean || field.type === 'boolean'
}

function getJsonPlaceholder(field: NodeDebugField): string {
  return isArrayField(field) ? '请输入 JSON 数组，例如 []' : '请输入 JSON 对象，例如 {}'
}

function getDisplayValue(field: NodeDebugField): string {
  const value = props.modelValue[field.key]
  if (value === undefined || value === null) {
    return ''
  }
  if (typeof value === 'string') {
    return value
  }
  if (isJsonField(field)) {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

function formatSchema(schema: OFStructuredJsonSchema): string {
  return JSON.stringify(schema, null, 2)
}

function handleExecute() {
  const list: string[] = []
  const normalized: Record<string, any> = {}

  for (const field of props.fields) {
    const rawValue = props.modelValue[field.key]

    if (isJsonField(field)) {
      if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') {
        if (field.required) {
          list.push(`"${field.label}" 为必填项`)
        }
        continue
      }

      try {
        const parsed = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue
        if (isArrayField(field) && !Array.isArray(parsed)) {
          list.push(`"${field.label}" 必须是 JSON 数组`)
          continue
        }
        if (isObjectField(field) && (Array.isArray(parsed) || parsed === null || typeof parsed !== 'object')) {
          list.push(`"${field.label}" 必须是 JSON 对象`)
          continue
        }
        normalized[field.key] = parsed
      } catch {
        list.push(`"${field.label}" 必须是合法 JSON`)
      }
      continue
    }

    if (isBooleanField(field)) {
      if (rawValue === undefined || rawValue === null || rawValue === '') {
        if (field.required) {
          list.push(`"${field.label}" 为必填项`)
        }
        continue
      }
      normalized[field.key] =
        typeof rawValue === 'boolean' ? rawValue : String(rawValue).trim().toLowerCase() === 'true'
      continue
    }

    if (isNumberField(field)) {
      const value = rawValue === undefined || rawValue === null ? '' : String(rawValue).trim()
      if (field.required && !value) {
        list.push(`"${field.label}" 为必填项`)
        continue
      }
      if (!value) {
        continue
      }
      const parsed = Number(value)
      if (!Number.isFinite(parsed)) {
        list.push(`"${field.label}" 必须是合法 number`)
        continue
      }
      normalized[field.key] = parsed
      continue
    }

    const value = rawValue === undefined || rawValue === null ? '' : String(rawValue)
    if (field.required && !value.trim()) {
      list.push(`"${field.label}" 为必填项`)
      continue
    }
    normalized[field.key] = rawValue
  }

  errors.value = list
  if (list.length > 0) return

  emit('execute', normalized)
}
</script>
