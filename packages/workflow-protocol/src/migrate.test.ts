import { describe, it, expect } from 'vitest'
import { migrateActionsToWorkflow } from './migrate'

describe('migrateActionsToWorkflow', () => {
  it('converts navigate action to workflow', () => {
    const actions = [{ type: 'navigate', url: '/pages/detail/index' }]
    const wf = migrateActionsToWorkflow(actions as any, 'onClick')
    // Should have start, end, and one action node
    const actionNodes = wf.nodes.filter(n => n.type === 'action')
    expect(actionNodes).toHaveLength(1)
    const actionNode = actionNodes[0] as any
    expect(actionNode.actionType).toBe('navigate')
    expect(actionNode.config.url).toBe('/pages/detail/index')
  })

  it('converts showToast action to workflow', () => {
    const actions = [{ type: 'showToast', title: '操作成功', icon: 'success' }]
    const wf = migrateActionsToWorkflow(actions as any, 'onClick')
    const actionNodes = wf.nodes.filter(n => n.type === 'action')
    expect(actionNodes).toHaveLength(1)
    const actionNode = actionNodes[0] as any
    expect(actionNode.actionType).toBe('showToast')
    expect(actionNode.config.title).toBe('操作成功')
  })

  it('converts multiple actions to sequential workflow', () => {
    const actions = [
      { type: 'showToast', title: '加载中', icon: 'loading' },
      { type: 'navigate', url: '/pages/list/index' },
    ]
    const wf = migrateActionsToWorkflow(actions as any, 'onClick')
    const actionNodes = wf.nodes.filter(n => n.type === 'action')
    expect(actionNodes).toHaveLength(2)
    // Edges: start->n1, n1->n2, n2->end = at least 3
    expect(wf.edges.length).toBeGreaterThanOrEqual(3)
  })

  it('has valid start and end nodes', () => {
    const actions = [{ type: 'navigate', url: '/pages/x/index' }]
    const wf = migrateActionsToWorkflow(actions as any, 'onSubmit')
    expect(wf.nodes.some(n => n.type === 'start')).toBe(true)
    expect(wf.nodes.some(n => n.type === 'end')).toBe(true)
  })

  it('converts empty actions to workflow with just start and end', () => {
    const wf = migrateActionsToWorkflow([], 'onClick')
    expect(wf.nodes).toHaveLength(2)
    expect(wf.edges).toHaveLength(1) // start -> end
  })

  it('converts setState action to workflow', () => {
    const actions = [{ type: 'setState', target: 'loading', value: 'false' }]
    const wf = migrateActionsToWorkflow(actions as any, 'onLoad')
    const actionNodes = wf.nodes.filter(n => n.type === 'action')
    expect(actionNodes).toHaveLength(1)
    const actionNode = actionNodes[0] as any
    expect(actionNode.actionType).toBe('setState')
    expect(actionNode.config.target).toBe('loading')
  })

  it('converts submitForm to callApi action type', () => {
    const actions = [{
      type: 'submitForm',
      dataSourceId: 'ds1',
      fieldMapping: { name: 'inputName' },
    }]
    const wf = migrateActionsToWorkflow(actions as any, 'onSubmit')
    const actionNodes = wf.nodes.filter(n => n.type === 'action')
    expect(actionNodes).toHaveLength(1)
    const actionNode = actionNodes[0] as any
    expect(actionNode.actionType).toBe('callApi')
  })
})
