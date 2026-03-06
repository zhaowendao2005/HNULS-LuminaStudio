import type {
  OFJsonSchemaObject,
  OFStructuredFieldType
} from '@shared/Orchestraflow-types'

export interface OFSchemaFieldDraft {
  id: string
  name: string
  type: OFStructuredFieldType
  required: boolean
  description?: string
}

export interface OFObjectSchemaEditorState {
  visible: boolean
  nodeId: string | null
  fields: OFSchemaFieldDraft[]
}

export function schemaToFieldDrafts(schema: OFJsonSchemaObject | null | undefined): OFSchemaFieldDraft[] {
  if (!schema) return []
  const required = new Set(schema.required || [])
  return Object.entries(schema.properties || {}).map(([name, value], index) => ({
    id: `schema_field_${index}_${name}`,
    name,
    type: value.type,
    required: required.has(name),
    description: value.description
  }))
}

export function fieldsToSchema(fields: OFSchemaFieldDraft[]): OFJsonSchemaObject {
  const normalized = fields.filter((field) => field.name.trim())
  return {
    type: 'object',
    properties: normalized.reduce<OFJsonSchemaObject['properties']>((acc, field) => {
      acc[field.name.trim()] = {
        type: field.type,
        description: field.description?.trim() || undefined
      }
      return acc
    }, {}),
    required: normalized.filter((field) => field.required).map((field) => field.name.trim()),
    additionalProperties: false
  }
}
