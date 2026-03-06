import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { OFJsonSchemaObject, OFStructuredFieldType } from '@shared/Orchestraflow-types'
import {
  fieldsToSchema,
  schemaToFieldDrafts,
  type OFObjectSchemaEditorState,
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
  const fields = ref<OFSchemaFieldDraft[]>([])

  const state = computed<OFObjectSchemaEditorState>(() => ({
    visible: visible.value,
    nodeId: nodeId.value,
    fields: fields.value
  }))

  const schema = computed<OFJsonSchemaObject>(() => fieldsToSchema(fields.value))

  function open(node: string, currentSchema?: OFJsonSchemaObject | null) {
    nodeId.value = node
    visible.value = true
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
    fields.value = []
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
    fields,
    state,
    schema,
    open,
    close,
    clear,
    addField,
    removeField,
    updateField,
    reset
  }
})
