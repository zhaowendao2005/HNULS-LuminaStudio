import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { OFStructuredFieldType, OFStructuredJsonSchema } from '@shared/Orchestraflow-types'
import {
  fieldsToSchema,
  resolveSchemaRootType,
  schemaToFieldDrafts,
  type OFObjectSchemaEditorState,
  type OFSchemaRootType,
  type OFSchemaFieldDraft
} from './object-schema-editor.types'

function createEmptyField(): OFSchemaFieldDraft {
  return {
    id: `schema_field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    type: 'string',
    required: true,
    description: ''
  }
}

export const useObjectSchemaEditorStore = defineStore('orchestraflow-object-schema-editor', () => {
  const visible = ref(false)
  const nodeId = ref<string | null>(null)
  const rootType = ref<OFSchemaRootType>('object')
  const fields = ref<OFSchemaFieldDraft[]>([])

  const state = computed<OFObjectSchemaEditorState>(() => ({
    visible: visible.value,
    nodeId: nodeId.value,
    rootType: rootType.value,
    fields: fields.value
  }))

  const schema = computed<OFStructuredJsonSchema>(() => fieldsToSchema(fields.value, rootType.value))

  function open(node: string, currentSchema?: OFStructuredJsonSchema | null) {
    nodeId.value = node
    visible.value = true
    rootType.value = resolveSchemaRootType(currentSchema)
    fields.value = schemaToFieldDrafts(currentSchema)
    if (!fields.value.length) {
      fields.value = [createEmptyField()]
    }
  }

  function close() {
    visible.value = false
  }

  function clear() {
    visible.value = false
    nodeId.value = null
    rootType.value = 'object'
    fields.value = []
  }

  function setRootType(nextRootType: OFSchemaRootType) {
    rootType.value = nextRootType
  }

  function addField(type: OFStructuredFieldType = 'string') {
    fields.value = [
      ...fields.value,
      {
        ...createEmptyField(),
        type
      }
    ]
  }

  function removeField(fieldId: string) {
    fields.value = fields.value.filter((field) => field.id !== fieldId)
    if (!fields.value.length) {
      fields.value = [createEmptyField()]
    }
  }

  function updateField(fieldId: string, patch: Partial<OFSchemaFieldDraft>) {
    fields.value = fields.value.map((field) =>
      field.id === fieldId
        ? {
            ...field,
            ...patch
          }
        : field
    )
  }

  function reset(type: OFStructuredFieldType = 'string') {
    fields.value = [
      {
        ...createEmptyField(),
        type
      }
    ]
  }

  return {
    visible,
    nodeId,
    rootType,
    fields,
    state,
    schema,
    open,
    close,
    clear,
    addField,
    removeField,
    updateField,
    setRootType,
    reset
  }
})
