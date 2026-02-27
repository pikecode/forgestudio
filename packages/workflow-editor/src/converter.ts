import type { WFPSchema, WFPNode, WFPEdge } from '@forgestudio/workflow-protocol'

/** LogicFlow node shape */
export interface LFNode {
  id: string
  type: string
  x: number
  y: number
  text?: string | { value: string }
  properties?: Record<string, unknown>
}

/** LogicFlow edge shape */
export interface LFEdge {
  id: string
  type?: string
  sourceNodeId: string
  targetNodeId: string
  text?: string | { value: string }
  properties?: Record<string, unknown>
}

/** LogicFlow graph data shape */
export interface LFGraph {
  nodes: LFNode[]
  edges: LFEdge[]
}

/** Convert WFP Schema to LogicFlow renderable graph data */
export function wfpToLogicFlow(schema: WFPSchema): LFGraph {
  const nodes: LFNode[] = schema.nodes.map(node => ({
    id: node.id,
    type: node.type,
    x: node.position.x,
    y: node.position.y,
    text: node.label,
    properties: nodeToProperties(node),
  }))

  const edges: LFEdge[] = schema.edges.map(edge => ({
    id: edge.id,
    type: 'polyline',
    sourceNodeId: edge.source,
    targetNodeId: edge.target,
    text: edge.label,
    properties: { condition: edge.condition },
  }))

  return { nodes, edges }
}

/** Convert LogicFlow graph data back to WFP Schema (preserves original metadata) */
export function logicFlowToWfp(graph: LFGraph, existing: WFPSchema): WFPSchema {
  const nodes: WFPNode[] = graph.nodes.map(lfNode => {
    const originalNode = existing.nodes.find(n => n.id === lfNode.id)
    const textValue = typeof lfNode.text === 'string'
      ? lfNode.text
      : (lfNode.text as { value: string } | undefined)?.value ?? ''
    const base = {
      position: { x: lfNode.x, y: lfNode.y },
      label: textValue,
    }
    if (originalNode) {
      return { ...originalNode, ...base }
    }
    return buildNewNode(lfNode.type as WFPNode['type'], lfNode.id, base, lfNode.properties ?? {})
  })

  const edges: WFPEdge[] = graph.edges.map(lfEdge => {
    const textValue = typeof lfEdge.text === 'string'
      ? lfEdge.text
      : (lfEdge.text as { value: string } | undefined)?.value
    return {
      id: lfEdge.id,
      source: lfEdge.sourceNodeId,
      target: lfEdge.targetNodeId,
      label: textValue,
      condition: (lfEdge.properties?.condition as string) ?? undefined,
    }
  })

  return {
    ...existing,
    nodes,
    edges,
    meta: { ...existing.meta, updatedAt: new Date().toISOString() },
  }
}

function nodeToProperties(node: WFPNode): Record<string, unknown> {
  const { id, type, label, position, description, ...rest } = node as WFPNode & {
    id: string
    type: string
    label: string
    position: { x: number; y: number }
    description?: string
  }
  return rest as Record<string, unknown>
}

function buildNewNode(
  type: WFPNode['type'],
  id: string,
  base: { position: { x: number; y: number }; label: string },
  _properties: Record<string, unknown>
): WFPNode {
  if (type === 'start') return { id, ...base, type: 'start' as const }
  if (type === 'end') return { id, ...base, type: 'end' as const }
  if (type === 'action') {
    return { id, ...base, type: 'action' as const, actionType: 'showToast' as const, config: {} }
  }
  if (type === 'condition') return { id, ...base, type: 'condition' as const, expression: '' }
  if (type === 'parallel') return { id, ...base, type: 'parallel' as const, mode: 'fork' as const }
  if (type === 'wait') return { id, ...base, type: 'wait' as const }
  if (type === 'subprocess') return { id, ...base, type: 'subprocess' as const, workflowId: '' }
  return { id, ...base, type: 'loop' as const, collection: '', itemVar: 'item' }
}
