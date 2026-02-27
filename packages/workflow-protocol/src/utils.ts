import type { WFPSchema, WFPNode, WFPEdge, WFPNodeType } from './types'

let _counter = 0
export function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${++_counter}`
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function createWorkflow(
  name: string,
  type: WFPSchema['type']
): WFPSchema {
  const startId = genId('start')
  const endId = genId('end')
  return {
    id: genId('wf'),
    name,
    type,
    version: '1.0.0',
    variables: [],
    nodes: [
      { id: startId, type: 'start' as const, label: '开始', position: { x: 100, y: 100 } },
      { id: endId, type: 'end' as const, label: '结束', position: { x: 100, y: 400 } },
    ],
    edges: [],
    meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  }
}

export function createNode(
  type: WFPNodeType,
  label: string,
  position: { x: number; y: number }
): WFPNode {
  const base = { id: genId(type), label, position }
  if (type === 'start') return { ...base, type: 'start' as const }
  if (type === 'end') return { ...base, type: 'end' as const }
  if (type === 'action') return { ...base, type: 'action' as const, actionType: 'showToast' as const, config: {} }
  if (type === 'condition') return { ...base, type: 'condition' as const, expression: '' }
  if (type === 'parallel') return { ...base, type: 'parallel' as const, mode: 'fork' as const }
  if (type === 'wait') return { ...base, type: 'wait' as const }
  if (type === 'subprocess') return { ...base, type: 'subprocess' as const, workflowId: '' }
  return { ...base, type: 'loop' as const, collection: '', itemVar: 'item' }
}

export function createEdge(source: string, target: string, label?: string): WFPEdge {
  return { id: genId('edge'), source, target, label }
}

export function validateWorkflow(schema: WFPSchema): ValidationResult {
  const errors: string[] = []
  const hasStart = schema.nodes.some(n => n.type === 'start')
  const hasEnd = schema.nodes.some(n => n.type === 'end')
  if (!hasStart) errors.push('流程必须包含一个 start 节点')
  if (!hasEnd) errors.push('流程必须包含至少一个 end 节点')
  const nodeIds = new Set(schema.nodes.map(n => n.id))
  for (const edge of schema.edges) {
    if (!nodeIds.has(edge.source)) errors.push(`连线 ${edge.id} 的源节点 ${edge.source} 不存在`)
    if (!nodeIds.has(edge.target)) errors.push(`连线 ${edge.id} 的目标节点 ${edge.target} 不存在`)
  }
  return { valid: errors.length === 0, errors }
}

export function getNodeById(schema: WFPSchema, id: string): WFPNode | undefined {
  return schema.nodes.find(n => n.id === id)
}

export function getEdgesByNode(
  schema: WFPSchema,
  nodeId: string,
  direction: 'outgoing' | 'incoming' | 'both' = 'both'
): WFPEdge[] {
  return schema.edges.filter(e => {
    if (direction === 'outgoing') return e.source === nodeId
    if (direction === 'incoming') return e.target === nodeId
    return e.source === nodeId || e.target === nodeId
  })
}
