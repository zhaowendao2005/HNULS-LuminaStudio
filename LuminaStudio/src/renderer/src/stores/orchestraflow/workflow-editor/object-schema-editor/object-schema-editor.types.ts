import type {
  OFJsonSchemaProperty,
  OFJsonSchemaObject,
  OFStructuredFieldType,
  OFStructuredJsonSchema
} from '@shared/Orchestraflow-types'

export type OFSchemaRootType = 'object' | 'array<object>'

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
  rootType: OFSchemaRootType
  fields: OFSchemaFieldDraft[]
}

function isPrimitiveSchemaNode(schema: OFJsonSchemaProperty): schema is { type: OFStructuredFieldType; description?: string } {
  return schema.type === 'string' || schema.type === 'number' || schema.type === 'boolean'
}

export function isVisualSchemaSupported(
  schema: OFStructuredJsonSchema | null | undefined
): boolean {
  if (!schema) return true

  const objectSchema = schema.type === 'array' ? schema.items : schema
  if (objectSchema.type !== 'object') return false

  return Object.values(objectSchema.properties || {}).every((item) => isPrimitiveSchemaNode(item))
}

export function schemaToFieldDrafts(
  schema: OFStructuredJsonSchema | null | undefined
): OFSchemaFieldDraft[] {
  if (!schema) return []
  const objectSchema = schema.type === 'array' ? schema.items : schema
  if (objectSchema.type !== 'object') return []
  const required = new Set(objectSchema.required || [])
  return Object.entries(objectSchema.properties || {}).map(([name, value], index) => ({
    id: `schema_field_${index}_${name}`,
    name,
    type: isPrimitiveSchemaNode(value) ? value.type : 'string',
    required: required.has(name),
    description: value.description
  }))
}

export function resolveSchemaRootType(
  schema: OFStructuredJsonSchema | null | undefined
): OFSchemaRootType {
  return schema?.type === 'array' ? 'array<object>' : 'object'
}

export function fieldsToSchemaObject(fields: OFSchemaFieldDraft[]): OFJsonSchemaObject {
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

export function fieldsToSchema(
  fields: OFSchemaFieldDraft[],
  rootType: OFSchemaRootType
): OFStructuredJsonSchema {
  const objectSchema = fieldsToSchemaObject(fields)
  if (rootType === 'array<object>') {
    return {
      type: 'array',
      items: objectSchema
    }
  }
  return objectSchema
}
