import type { OFGenerationGraphState, OFNode } from '@shared/Orchestraflow-types'
import { OFBlockEnum, buildOFStableOutputNamespace } from '@shared/Orchestraflow-types'
import { reduceGenerationGraphState, type GenerationGraphMutation } from './graph-state-reducer'

function createNode(id: string, type: OFBlockEnum, title: string, x: number, y: number): OFNode {
  return {
    id,
    type,
    position: { x, y },
    data: {
      title,
      desc: '',
      type,
      output_namespace: buildOFStableOutputNamespace(id, title),
      ...(type === OFBlockEnum.Start ? { input: { variables: [] } } : {}),
      ...(type === OFBlockEnum.End ? { output: { variables: [] } } : {}),
      ...(type === OFBlockEnum.LLM
        ? {
            model: { provider: '', name: '' },
            prompt_template: [],
            structured_output: { enabled: false, schema: null },
            output: { variables: [] }
          }
        : {}),
      ...(type === OFBlockEnum.IfElse
        ? { cases: [], elseCase: { handleId: 'else', label: 'ELSE' } }
        : {}),
      ...(type === OFBlockEnum.VariableAssign ? { rules: [], output: { variables: [] } } : {}),
      ...(type === OFBlockEnum.Iteration || type === OFBlockEnum.Loop
        ? { output: { variables: [] } }
        : {})
    } as OFNode['data']
  } as OFNode
}

export function applyPromptToGraphState(
  prompt: string,
  current?: OFGenerationGraphState
): OFGenerationGraphState {
  const text = prompt.toLowerCase()
  const mutations: GenerationGraphMutation[] = []
  const start = createNode('gen-start', OFBlockEnum.Start, '开始', 80, 220)
  const end = createNode('gen-end', OFBlockEnum.End, '结束', 860, 220)
  const middleType =
    text.includes('if') || text.includes('branch') ? OFBlockEnum.IfElse : OFBlockEnum.LLM
  const middleTitle = middleType === OFBlockEnum.IfElse ? '条件分支' : '生成节点'
  const middle = createNode('gen-middle', middleType, middleTitle, 460, 220)

  mutations.push({
    type: 'replace',
    state:
      current ||
      ({
        version: 0,
        checkpoints_version: 0,
        nodes: [],
        edges: [],
        node_snapshots: []
      } as OFGenerationGraphState)
  })
  mutations.push({ type: 'upsert-node', node: start })
  mutations.push({ type: 'upsert-node', node: middle })
  mutations.push({ type: 'upsert-node', node: end })
  mutations.push({
    type: 'add-edge',
    edge: {
      id: 'edge_start_middle',
      source: start.id,
      target: middle.id,
      sourceHandle: 'source',
      targetHandle: 'target'
    }
  })
  mutations.push({
    type: 'add-edge',
    edge: {
      id: 'edge_middle_end',
      source: middle.id,
      target: end.id,
      sourceHandle: middleType === OFBlockEnum.IfElse ? 'else' : 'source',
      targetHandle: 'target'
    }
  })

  return reduceGenerationGraphState(current, mutations)
}
