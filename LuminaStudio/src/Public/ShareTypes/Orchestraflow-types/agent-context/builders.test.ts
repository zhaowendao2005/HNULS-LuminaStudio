import { describe, expect, it } from 'vitest'
import {
  buildOFBlueprintContextPack,
  buildOFEditContextPack,
  buildOFRequirementContextPack
} from '.'

describe('OF agent context pack builders', () => {
  it('builds requirement/blueprint/edit packs from the same registries', () => {
    const requirementPack = buildOFRequirementContextPack()
    const blueprintPack = buildOFBlueprintContextPack()
    const editPack = buildOFEditContextPack()

    expect(requirementPack.manifest.kind).toBe('requirement')
    expect(blueprintPack.manifest.kind).toBe('blueprint')
    expect(editPack.manifest.kind).toBe('edit')

    const requirementNodeCount = ((requirementPack.payload.nodes as unknown[]) || []).length
    const blueprintNodeCount = ((blueprintPack.payload.nodes as unknown[]) || []).length
    const editNodeCount = ((editPack.payload.nodes as unknown[]) || []).length

    expect(requirementNodeCount).toBeGreaterThan(0)
    expect(requirementNodeCount).toBe(blueprintNodeCount)
    expect(blueprintNodeCount).toBe(editNodeCount)
  })
})
