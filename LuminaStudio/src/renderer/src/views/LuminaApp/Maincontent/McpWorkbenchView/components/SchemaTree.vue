<template>
  <div
    class="mcp-schema-tree border-l-2 pl-3 py-1.5"
    :class="depthClasses[depth % depthClasses.length]"
  >
    <div class="flex items-center gap-2 flex-wrap">
      <span class="text-[13px] font-semibold text-slate-900">{{ name }}</span>
      <span class="text-[11px] font-mono text-cyan-700">{{ schemaType }}</span>
      <span v-if="required" class="text-[10px] font-semibold uppercase text-rose-600">
        Required
      </span>
    </div>
    <p v-if="description" class="mt-1 text-xs leading-5 text-slate-500">{{ description }}</p>
    <div v-if="isObject" class="mt-2 space-y-2">
      <SchemaTree
        v-for="[key, childSchema] in objectEntries"
        :key="key"
        :name="key"
        :schema="childSchema"
        :required="requiredKeys.includes(key)"
        :depth="depth + 1"
      />
    </div>
    <div v-else-if="isArray && arrayItemSchema" class="mt-2">
      <SchemaTree :name="'[items]'" :schema="arrayItemSchema" :depth="depth + 1" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type JsonSchema = Record<string, unknown>

const props = withDefaults(
  defineProps<{
    name: string
    schema?: JsonSchema
    required?: boolean
    depth?: number
  }>(),
  {
    schema: () => ({}),
    required: false,
    depth: 0
  }
)

const depthClasses = [
  'border-emerald-500',
  'border-cyan-500',
  'border-violet-500',
  'border-amber-500'
]
const schemaType = computed(() => {
  const type = typeof props.schema?.type === 'string' ? props.schema.type : 'unknown'
  const enumValues = Array.isArray(props.schema?.enum) ? props.schema.enum.join(', ') : ''
  return enumValues ? `${type} [${enumValues}]` : type
})
const description = computed(() =>
  typeof props.schema?.description === 'string' ? props.schema.description : ''
)
const isObject = computed(() => props.schema?.type === 'object' && props.schema?.properties)
const isArray = computed(() => props.schema?.type === 'array')
const objectEntries = computed(() =>
  Object.entries((props.schema?.properties as Record<string, JsonSchema>) ?? {})
)
const requiredKeys = computed(() =>
  Array.isArray(props.schema?.required) ? props.schema.required : []
)
const arrayItemSchema = computed(() => (props.schema?.items as JsonSchema | undefined) ?? undefined)
</script>
