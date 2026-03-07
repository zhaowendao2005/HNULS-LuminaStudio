import { describe, expect, it } from 'vitest'
import { normalizeWorkflowInputs } from './workflow-run.store'
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
