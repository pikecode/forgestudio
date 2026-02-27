import { describe, it, expect } from 'vitest'
import { wfpToLogicFlow, logicFlowToWfp } from './converter'
import { createWorkflow, createEdge } from '@forgestudio/workflow-protocol'

describe('wfpToLogicFlow', () => {
  it('converts WFP nodes to LogicFlow nodes', () => {
    const wf = createWorkflow('test', 'interaction')
    const result = wfpToLogicFlow(wf)
    expect(result.nodes).toHaveLength(2)
    expect(result.nodes[0].type).toBe('start')
    expect(result.nodes[0].x).toBe(wf.nodes[0].position.x)
    expect(result.nodes[0].y).toBe(wf.nodes[0].position.y)
  })

  it('converts WFP edges to LogicFlow edges', () => {
    const wf = createWorkflow('test', 'interaction')
    const startId = wf.nodes[0].id
    const endId = wf.nodes[1].id
    wf.edges.push(createEdge(startId, endId, 'next'))
    const result = wfpToLogicFlow(wf)
    expect(result.edges).toHaveLength(1)
    expect(result.edges[0].sourceNodeId).toBe(startId)
    expect(result.edges[0].targetNodeId).toBe(endId)
  })
})

describe('logicFlowToWfp', () => {
  it('round-trips WFP through LogicFlow format', () => {
    const wf = createWorkflow('test', 'interaction')
    const lfData = wfpToLogicFlow(wf)
    const result = logicFlowToWfp(lfData, wf)
    expect(result.nodes).toHaveLength(2)
    expect(result.id).toBe(wf.id)
    expect(result.name).toBe(wf.name)
  })

  it('preserves node positions from LogicFlow', () => {
    const wf = createWorkflow('test', 'interaction')
    const lfData = wfpToLogicFlow(wf)
    // Simulate user moving a node
    lfData.nodes[0].x = 250
    lfData.nodes[0].y = 300
    const result = logicFlowToWfp(lfData, wf)
    expect(result.nodes[0].position).toEqual({ x: 250, y: 300 })
  })
})
