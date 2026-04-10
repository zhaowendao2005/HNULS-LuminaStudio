import { describe, expect, it } from 'vitest'
import {
  layoutRuntimeGraph,
  type RuntimeLayoutEdgeInput,
  type RuntimeLayoutNodeInput
} from './agent-runtime-graph.layout'

function positionMap(nodes: RuntimeLayoutNodeInput[]) {
  const layout = layoutRuntimeGraph(nodes, [] satisfies RuntimeLayoutEdgeInput[])
  return new Map(layout.nodes.map((node) => [node.id, node]))
}

function centerY(
  node: RuntimeLayoutNodeInput,
  positions: Map<string, { id: string; x: number; y: number }>
) {
  const position = positions.get(node.id)
  if (!position) {
    throw new Error(`Missing position for ${node.id}`)
  }
  return position.y + node.height / 2
}

describe('layoutRuntimeGraph', () => {
  it('keeps llm nodes on the backbone and moves tool nodes into side branches', () => {
    const nodes: RuntimeLayoutNodeInput[] = [
      {
        id: 'user:1',
        kind: 'user-query',
        width: 292,
        height: 148,
        appearanceOrder: 0,
        agentRunId: null,
        childAgentRunId: null,
        sourceActionNodeId: null,
        triggerLlmNodeId: null
      },
      {
        id: 'llm:1',
        kind: 'llm-call',
        width: 320,
        height: 164,
        appearanceOrder: 1,
        agentRunId: 'root-run',
        childAgentRunId: null,
        sourceActionNodeId: null,
        triggerLlmNodeId: null
      },
      {
        id: 'action:1',
        kind: 'action',
        width: 320,
        height: 164,
        appearanceOrder: 2,
        agentRunId: 'root-run',
        childAgentRunId: null,
        sourceActionNodeId: null,
        triggerLlmNodeId: 'llm:1'
      },
      {
        id: 'functioncall:1',
        kind: 'functioncall',
        width: 320,
        height: 164,
        appearanceOrder: 3,
        agentRunId: 'root-run',
        childAgentRunId: null,
        sourceActionNodeId: null,
        triggerLlmNodeId: 'llm:1'
      },
      {
        id: 'llm:2',
        kind: 'llm-call',
        width: 320,
        height: 164,
        appearanceOrder: 4,
        agentRunId: 'root-run',
        childAgentRunId: null,
        sourceActionNodeId: null,
        triggerLlmNodeId: null
      },
      {
        id: 'runtime:1',
        kind: 'runtime-hub',
        width: 344,
        height: 164,
        appearanceOrder: 5,
        agentRunId: null,
        childAgentRunId: null,
        sourceActionNodeId: null,
        triggerLlmNodeId: null
      }
    ]

    const positions = positionMap(nodes)
    const llm1CenterY = centerY(nodes[1]!, positions)
    const actionCenterY = centerY(nodes[2]!, positions)
    const functioncallCenterY = centerY(nodes[3]!, positions)
    const llm2CenterY = centerY(nodes[4]!, positions)

    expect(llm1CenterY).toBe(llm2CenterY)
    expect(actionCenterY).not.toBe(llm1CenterY)
    expect(functioncallCenterY).not.toBe(llm1CenterY)
    expect(actionCenterY - llm1CenterY).toBe(-(functioncallCenterY - llm1CenterY))
  })

  it('keeps subagent chains on a dedicated corridor between parent llm nodes', () => {
    const nodes: RuntimeLayoutNodeInput[] = [
      {
        id: 'user:1',
        kind: 'user-query',
        width: 292,
        height: 148,
        appearanceOrder: 0,
        agentRunId: null,
        childAgentRunId: null,
        sourceActionNodeId: null,
        triggerLlmNodeId: null
      },
      {
        id: 'llm:root-1',
        kind: 'llm-call',
        width: 320,
        height: 164,
        appearanceOrder: 1,
        agentRunId: 'root-run',
        childAgentRunId: null,
        sourceActionNodeId: null,
        triggerLlmNodeId: null
      },
      {
        id: 'action:dispatch',
        kind: 'action',
        width: 320,
        height: 164,
        appearanceOrder: 2,
        agentRunId: 'root-run',
        childAgentRunId: 'child-run',
        sourceActionNodeId: null,
        triggerLlmNodeId: 'llm:root-1'
      },
      {
        id: 'subagent:1',
        kind: 'subagent',
        width: 344,
        height: 164,
        appearanceOrder: 3,
        agentRunId: null,
        childAgentRunId: 'child-run',
        sourceActionNodeId: 'action:dispatch',
        triggerLlmNodeId: 'llm:root-1'
      },
      {
        id: 'llm:child-1',
        kind: 'llm-call',
        width: 320,
        height: 164,
        appearanceOrder: 4,
        agentRunId: 'child-run',
        childAgentRunId: null,
        sourceActionNodeId: null,
        triggerLlmNodeId: null
      },
      {
        id: 'action:child-1',
        kind: 'action',
        width: 320,
        height: 164,
        appearanceOrder: 5,
        agentRunId: 'child-run',
        childAgentRunId: null,
        sourceActionNodeId: null,
        triggerLlmNodeId: 'llm:child-1'
      },
      {
        id: 'llm:root-2',
        kind: 'llm-call',
        width: 320,
        height: 164,
        appearanceOrder: 6,
        agentRunId: 'root-run',
        childAgentRunId: null,
        sourceActionNodeId: null,
        triggerLlmNodeId: null
      },
      {
        id: 'runtime:1',
        kind: 'runtime-hub',
        width: 344,
        height: 164,
        appearanceOrder: 7,
        agentRunId: null,
        childAgentRunId: null,
        sourceActionNodeId: null,
        triggerLlmNodeId: null
      }
    ]

    const positions = positionMap(nodes)
    const root1CenterY = centerY(nodes[1]!, positions)
    const dispatchCenterY = centerY(nodes[2]!, positions)
    const subagentCenterY = centerY(nodes[3]!, positions)
    const childLlmCenterY = centerY(nodes[4]!, positions)
    const childActionCenterY = centerY(nodes[5]!, positions)
    const root2CenterY = centerY(nodes[6]!, positions)

    expect(root1CenterY).toBe(root2CenterY)
    expect(dispatchCenterY).not.toBe(root1CenterY)
    expect(subagentCenterY).toBe(childLlmCenterY)
    expect(subagentCenterY).not.toBe(root1CenterY)
    expect(childActionCenterY).not.toBe(childLlmCenterY)
    expect(positions.get('llm:child-1')!.x).toBeGreaterThan(positions.get('subagent:1')!.x)
    expect(positions.get('llm:child-1')!.x).toBeLessThan(positions.get('llm:root-2')!.x)
  })
})
