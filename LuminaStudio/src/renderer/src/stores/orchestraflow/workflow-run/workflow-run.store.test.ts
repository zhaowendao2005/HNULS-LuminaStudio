import { describe, expect, it } from 'vitest'
import { buildWorkflowInputDefaultValue, normalizeWorkflowInputs } from './workflow-run.store'
import { OFVarType, type OFInputVar } from '@shared/Orchestraflow-types'

describe('normalizeWorkflowInputs', () => {
  it('parses object inputs from JSON strings', () => {
    const inputVars: OFInputVar[] = [
      {
        variable: 'profile',
        type: OFVarType.Object,
        required: true
      }
    ]

    const result = normalizeWorkflowInputs(inputVars, {
      profile: '{"name":"Lumina","stats":{"score":42}}'
    })

    expect(result.errors).toEqual([])
    expect(result.values).toEqual({
      profile: {
        name: 'Lumina',
        stats: {
          score: 42
        }
      }
    })
  })

  it('rejects non-object JSON values for object inputs', () => {
    const inputVars: OFInputVar[] = [
      {
        variable: 'profile',
        type: OFVarType.Object,
        required: true
      }
    ]

    const result = normalizeWorkflowInputs(inputVars, {
      profile: '[]'
    })

    expect(result.values).toEqual({})
    expect(result.errors).toEqual(['"profile" 必须是 JSON 对象'])
  })
})

describe('buildWorkflowInputDefaultValue', () => {
  it('builds nested object defaults from schema properties', () => {
    const inputVar: OFInputVar = {
      variable: 'task_config',
      type: OFVarType.Object,
      schema: {
        type: 'object',
        properties: {
          source_content: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                default: 'Demo title'
              },
              published: {
                type: 'boolean',
                default: false
              }
            },
            required: ['title', 'published'],
            additionalProperties: false
          },
          seo_settings: {
            type: 'object',
            properties: {
              keyword_label: {
                type: 'string',
                default: 'LLM Workflow'
              }
            },
            required: ['keyword_label'],
            additionalProperties: false
          }
        },
        required: ['source_content', 'seo_settings'],
        additionalProperties: false
      }
    }

    expect(buildWorkflowInputDefaultValue(inputVar)).toEqual({
      source_content: {
        title: 'Demo title',
        published: false
      },
      seo_settings: {
        keyword_label: 'LLM Workflow'
      }
    })
  })

  it('prefers explicit variable-level default for array values', () => {
    const inputVar: OFInputVar = {
      variable: 'items',
      type: OFVarType.Array,
      default: ['preset']
    }

    expect(buildWorkflowInputDefaultValue(inputVar)).toEqual(['preset'])
  })

  it('uses raw array default values directly', () => {
    const inputVar: OFInputVar = {
      variable: 'task_list',
      type: OFVarType.Array,
      default: [
        {
          task_name: '初始化任务',
          params: {
            retry: true
          }
        }
      ]
    }

    expect(buildWorkflowInputDefaultValue(inputVar)).toEqual([
      {
        task_name: '初始化任务',
        params: {
          retry: true
        }
      }
    ])
  })
})
