import { describe, it, expect } from 'vitest'
import { transformWorkflowToHandler } from './transformer'
import { createWorkflow, createNode, createEdge } from '@forgestudio/workflow-protocol'
import type { WFPActionNode } from '@forgestudio/workflow-protocol'

describe('transformWorkflowToHandler', () => {
  it('generates async function body for showToast action', () => {
    const wf = createWorkflow('submitFlow', 'interaction')
    const startNode = wf.nodes.find(n => n.type === 'start')!
    const endNode = wf.nodes.find(n => n.type === 'end')!

    const toastNode = createNode('action', '显示提示', { x: 200, y: 200 }) as WFPActionNode
    ;(toastNode as any).actionType = 'showToast'
    ;(toastNode as any).config = { title: '提交成功', icon: 'success' }
    wf.nodes.push(toastNode)

    wf.edges.push(createEdge(startNode.id, toastNode.id))
    wf.edges.push(createEdge(toastNode.id, endNode.id))

    const result = transformWorkflowToHandler(wf)
    expect(result.name).toBeTruthy()
    expect(result.body).toContain('Taro.showToast')
    expect(result.body).toContain('提交成功')
  })

  it('generates if/else for condition node', () => {
    const wf = createWorkflow('condFlow', 'interaction')
    const startNode = wf.nodes.find(n => n.type === 'start')!

    const condNode = createNode('condition', '判断结果', { x: 200, y: 200 })
    ;(condNode as any).expression = 'result.code === 0'
    wf.nodes.push(condNode)

    const successNode = createNode('action', '成功提示', { x: 100, y: 350 }) as WFPActionNode
    ;(successNode as any).actionType = 'showToast'
    ;(successNode as any).config = { title: '成功', icon: 'success' }
    wf.nodes.push(successNode)

    const failNode = createNode('action', '失败提示', { x: 300, y: 350 }) as WFPActionNode
    ;(failNode as any).actionType = 'showToast'
    ;(failNode as any).config = { title: '失败', icon: 'error' }
    wf.nodes.push(failNode)

    wf.edges.push(createEdge(startNode.id, condNode.id))
    wf.edges.push({ ...createEdge(condNode.id, successNode.id), condition: 'true', label: 'true' })
    wf.edges.push({ ...createEdge(condNode.id, failNode.id), condition: 'false', label: 'false' })

    const result = transformWorkflowToHandler(wf)
    expect(result.body).toContain('if (result.code === 0)')
    expect(result.body).toContain('else')
  })

  it('generates Taro.navigateTo for navigate action', () => {
    const wf = createWorkflow('navFlow', 'interaction')
    const startNode = wf.nodes.find(n => n.type === 'start')!
    const endNode = wf.nodes.find(n => n.type === 'end')!

    const navNode = createNode('action', '跳转', { x: 200, y: 200 }) as WFPActionNode
    ;(navNode as any).actionType = 'navigate'
    ;(navNode as any).config = { url: '/pages/detail/index' }
    wf.nodes.push(navNode)

    wf.edges.push(createEdge(startNode.id, navNode.id))
    wf.edges.push(createEdge(navNode.id, endNode.id))

    const result = transformWorkflowToHandler(wf)
    expect(result.body).toContain('Taro.navigateTo')
    expect(result.body).toContain('/pages/detail/index')
  })

  it('generates setState call for setState action', () => {
    const wf = createWorkflow('stateFlow', 'interaction')
    const startNode = wf.nodes.find(n => n.type === 'start')!
    const endNode = wf.nodes.find(n => n.type === 'end')!

    const stateNode = createNode('action', '设置状态', { x: 200, y: 200 }) as WFPActionNode
    ;(stateNode as any).actionType = 'setState'
    ;(stateNode as any).config = { target: 'loading', value: 'true' }
    wf.nodes.push(stateNode)

    wf.edges.push(createEdge(startNode.id, stateNode.id))
    wf.edges.push(createEdge(stateNode.id, endNode.id))

    const result = transformWorkflowToHandler(wf)
    expect(result.body).toContain('setLoading')
    expect(result.body).toContain('true')
  })

  it('returns handler with name, body, and params fields', () => {
    const wf = createWorkflow('myFlow', 'interaction')
    const result = transformWorkflowToHandler(wf)
    expect(result).toHaveProperty('name')
    expect(result).toHaveProperty('body')
    expect(result).toHaveProperty('params')
    expect(Array.isArray(result.params)).toBe(true)
  })
})
