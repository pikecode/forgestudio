import { describe, it, expect } from 'vitest'
import {
  createWorkflow,
  createNode,
  createEdge,
  validateWorkflow,
  getNodeById,
  getEdgesByNode,
} from './utils'

describe('createWorkflow', () => {
  it('creates a workflow with required fields', () => {
    const wf = createWorkflow('测试流程', 'interaction')
    expect(wf.id).toBeTruthy()
    expect(wf.name).toBe('测试流程')
    expect(wf.type).toBe('interaction')
    expect(wf.version).toBe('1.0.0')
    expect(wf.nodes).toHaveLength(2) // start + end
    expect(wf.edges).toHaveLength(0)
    expect(wf.variables).toHaveLength(0)
  })
})

describe('createNode', () => {
  it('creates an action node with position', () => {
    const node = createNode('action', 'API 调用', { x: 100, y: 200 })
    expect(node.id).toBeTruthy()
    expect(node.type).toBe('action')
    expect(node.label).toBe('API 调用')
    expect(node.position).toEqual({ x: 100, y: 200 })
  })
})

describe('createEdge', () => {
  it('creates an edge between two nodes', () => {
    const edge = createEdge('node-1', 'node-2')
    expect(edge.id).toBeTruthy()
    expect(edge.source).toBe('node-1')
    expect(edge.target).toBe('node-2')
  })
})

describe('validateWorkflow', () => {
  it('passes for a valid workflow', () => {
    const wf = createWorkflow('valid', 'interaction')
    const result = validateWorkflow(wf)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('fails when no start node', () => {
    const wf = createWorkflow('no-start', 'interaction')
    wf.nodes = wf.nodes.filter(n => n.type !== 'start')
    const result = validateWorkflow(wf)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('start'))).toBe(true)
  })

  it('fails when no end node', () => {
    const wf = createWorkflow('no-end', 'interaction')
    wf.nodes = wf.nodes.filter(n => n.type !== 'end')
    const result = validateWorkflow(wf)
    expect(result.valid).toBe(false)
  })
})

describe('getNodeById', () => {
  it('returns node when found', () => {
    const wf = createWorkflow('test', 'interaction')
    const startNode = wf.nodes.find(n => n.type === 'start')!
    expect(getNodeById(wf, startNode.id)).toBe(startNode)
  })

  it('returns undefined when not found', () => {
    const wf = createWorkflow('test', 'interaction')
    expect(getNodeById(wf, 'nonexistent')).toBeUndefined()
  })
})

describe('getEdgesByNode', () => {
  it('returns outgoing edges for a node', () => {
    const wf = createWorkflow('test', 'interaction')
    const startId = wf.nodes.find(n => n.type === 'start')!.id
    const endId = wf.nodes.find(n => n.type === 'end')!.id
    wf.edges.push(createEdge(startId, endId))
    const edges = getEdgesByNode(wf, startId, 'outgoing')
    expect(edges).toHaveLength(1)
    expect(edges[0].source).toBe(startId)
  })
})
