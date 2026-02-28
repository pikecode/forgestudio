import { describe, it, expect } from 'vitest'
import { transformWorkflowToHandler } from './transformer'
import { createWorkflow, createNode, createEdge } from '@forgestudio/workflow-protocol'
import type { WFPActionNode, WFPWaitNode } from '@forgestudio/workflow-protocol'

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

  it('generates all actions in a sequential chain', () => {
    const wf = createWorkflow('seqFlow', 'interaction')
    const startNode = wf.nodes.find(n => n.type === 'start')!
    const endNode = wf.nodes.find(n => n.type === 'end')!

    const node1 = createNode('action', '校验表单', { x: 200, y: 100 }) as WFPActionNode
    ;(node1 as any).actionType = 'validateForm'
    ;(node1 as any).config = {}

    const node2 = createNode('action', '调接口', { x: 200, y: 200 }) as WFPActionNode
    ;(node2 as any).actionType = 'callApi'
    ;(node2 as any).config = { dataSourceId: 'submit' }
    ;(node2 as any).outputVar = 'result'

    const node3 = createNode('action', '跳转', { x: 200, y: 300 }) as WFPActionNode
    ;(node3 as any).actionType = 'navigate'
    ;(node3 as any).config = { url: '/pages/success/index' }

    wf.nodes.push(node1, node2, node3)
    wf.edges.push(
      createEdge(startNode.id, node1.id),
      createEdge(node1.id, node2.id),
      createEdge(node2.id, node3.id),
      createEdge(node3.id, endNode.id),
    )

    const result = transformWorkflowToHandler(wf)
    const body = result.body

    // All 3 actions must appear in order
    expect(body).toContain('validateForm')
    expect(body).toContain('fetch_submit')
    expect(body).toContain('Taro.navigateTo')
    expect(body.indexOf('validateForm')).toBeLessThan(body.indexOf('fetch_submit'))
    expect(body.indexOf('fetch_submit')).toBeLessThan(body.indexOf('Taro.navigateTo'))
  })

  it('captures callApi response into outputVar accessible after try block', () => {
    const wf = createWorkflow('apiFlow', 'interaction')
    const startNode = wf.nodes.find(n => n.type === 'start')!
    const endNode = wf.nodes.find(n => n.type === 'end')!

    const apiNode = createNode('action', '调接口', { x: 200, y: 200 }) as WFPActionNode
    ;(apiNode as any).actionType = 'callApi'
    ;(apiNode as any).config = { dataSourceId: 'userApi' }
    ;(apiNode as any).outputVar = 'userData'

    const toastNode = createNode('action', '提示', { x: 200, y: 300 }) as WFPActionNode
    ;(toastNode as any).actionType = 'showToast'
    ;(toastNode as any).config = { title: '加载完成' }

    wf.nodes.push(apiNode, toastNode)
    wf.edges.push(
      createEdge(startNode.id, apiNode.id),
      createEdge(apiNode.id, toastNode.id),
      createEdge(toastNode.id, endNode.id),
    )

    const result = transformWorkflowToHandler(wf)
    const body = result.body

    // userData must be declared BEFORE the try block so it's accessible after
    const letIndex = body.indexOf('let userData')
    const tryIndex = body.indexOf('try {')
    expect(letIndex).toBeGreaterThanOrEqual(0)
    expect(letIndex).toBeLessThan(tryIndex)
    // And the toast after the try block should still be generated
    expect(body).toContain('Taro.showToast')
    expect(body.indexOf('try {')).toBeLessThan(body.indexOf('Taro.showToast'))
  })

  it('continues executing nodes after condition branches converge', () => {
    const wf = createWorkflow('condContinueFlow', 'interaction')
    const startNode = wf.nodes.find(n => n.type === 'start')!
    const endNode = wf.nodes.find(n => n.type === 'end')!

    const condNode = createNode('condition', '判断', { x: 200, y: 200 })
    ;(condNode as any).expression = 'res.code === 0'

    const successNode = createNode('action', '成功提示', { x: 100, y: 350 }) as WFPActionNode
    ;(successNode as any).actionType = 'showToast'
    ;(successNode as any).config = { title: '成功' }

    const failNode = createNode('action', '失败提示', { x: 300, y: 350 }) as WFPActionNode
    ;(failNode as any).actionType = 'showToast'
    ;(failNode as any).config = { title: '失败' }

    const finalNode = createNode('action', '最终跳转', { x: 200, y: 500 }) as WFPActionNode
    ;(finalNode as any).actionType = 'navigate'
    ;(finalNode as any).config = { url: '/pages/home/index' }

    wf.nodes.push(condNode, successNode, failNode, finalNode)
    wf.edges.push(
      createEdge(startNode.id, condNode.id),
      { ...createEdge(condNode.id, successNode.id), condition: 'true', label: 'true' },
      { ...createEdge(condNode.id, failNode.id), condition: 'false', label: 'false' },
      createEdge(successNode.id, finalNode.id),
      createEdge(failNode.id, finalNode.id),
      createEdge(finalNode.id, endNode.id),
    )

    const result = transformWorkflowToHandler(wf)
    const body = result.body

    expect(body).toContain('if (res.code === 0)')
    expect(body).toContain('成功')
    expect(body).toContain('失败')
    // Final node must appear AFTER the if/else block
    expect(body).toContain('Taro.navigateTo')
    const ifIndex = body.indexOf('if (res.code === 0)')
    const navIndex = body.indexOf('Taro.navigateTo')
    expect(navIndex).toBeGreaterThan(ifIndex)
  })

  it('generates Promise.all for parallel node with multiple branches', () => {
    const wf = createWorkflow('parallelFlow', 'data-orchestration')
    const startNode = wf.nodes.find(n => n.type === 'start')!
    const endNode = wf.nodes.find(n => n.type === 'end')!

    const parallelNode = createNode('parallel', '并行拉取', { x: 200, y: 200 })
    ;(parallelNode as any).outputVar = 'results'

    const api1 = createNode('action', '拉取用户', { x: 100, y: 350 }) as WFPActionNode
    ;(api1 as any).actionType = 'callApi'
    ;(api1 as any).config = { dataSourceId: 'userApi' }

    const api2 = createNode('action', '拉取产品', { x: 200, y: 350 }) as WFPActionNode
    ;(api2 as any).actionType = 'callApi'
    ;(api2 as any).config = { dataSourceId: 'productApi' }

    const api3 = createNode('action', '拉取购物车', { x: 300, y: 350 }) as WFPActionNode
    ;(api3 as any).actionType = 'callApi'
    ;(api3 as any).config = { dataSourceId: 'cartApi' }

    const toastNode = createNode('action', '完成提示', { x: 200, y: 500 }) as WFPActionNode
    ;(toastNode as any).actionType = 'showToast'
    ;(toastNode as any).config = { title: '加载完成' }

    wf.nodes.push(parallelNode, api1, api2, api3, toastNode)
    wf.edges.push(
      createEdge(startNode.id, parallelNode.id),
      createEdge(parallelNode.id, api1.id),
      createEdge(parallelNode.id, api2.id),
      createEdge(parallelNode.id, api3.id),
      createEdge(api1.id, toastNode.id),
      createEdge(api2.id, toastNode.id),
      createEdge(api3.id, toastNode.id),
      createEdge(toastNode.id, endNode.id),
    )

    const result = transformWorkflowToHandler(wf)
    const body = result.body

    // Must generate Promise.all
    expect(body).toContain('Promise.all')
    // Must declare results variable
    expect(body).toContain('const results =')
    // All 3 API calls must be inside Promise.all
    expect(body).toContain('fetch_userApi')
    expect(body).toContain('fetch_productApi')
    expect(body).toContain('fetch_cartApi')
    // Toast must appear after Promise.all
    const promiseIndex = body.indexOf('Promise.all')
    const toastIndex = body.indexOf('Taro.showToast')
    expect(toastIndex).toBeGreaterThan(promiseIndex)
  })

  it('generates for...of loop for loop node', () => {
    const wf = createWorkflow('loopFlow', 'data-orchestration')
    const startNode = wf.nodes.find(n => n.type === 'start')!
    const endNode = wf.nodes.find(n => n.type === 'end')!

    const loopNode = createNode('loop', '遍历列表', { x: 200, y: 200 })
    ;(loopNode as any).collection = 'items'
    ;(loopNode as any).itemVar = 'item'

    const bodyNode = createNode('action', '处理单项', { x: 200, y: 350 }) as WFPActionNode
    ;(bodyNode as any).actionType = 'showToast'
    ;(bodyNode as any).config = { title: '处理中' }

    wf.nodes.push(loopNode, bodyNode)
    wf.edges.push(
      createEdge(startNode.id, loopNode.id),
      createEdge(loopNode.id, bodyNode.id),
      createEdge(bodyNode.id, endNode.id),
    )

    const result = transformWorkflowToHandler(wf)
    expect(result.body).toContain('for (const item of items)')
    expect(result.body).toContain('Taro.showToast')
    const forIndex = result.body.indexOf('for (const item of items)')
    const toastIndex = result.body.indexOf('Taro.showToast')
    expect(toastIndex).toBeGreaterThan(forIndex)
  })

  it('generates delay for wait node with duration', () => {
    const wf = createWorkflow('waitFlow', 'interaction')
    const startNode = wf.nodes.find(n => n.type === 'start')!
    const endNode = wf.nodes.find(n => n.type === 'end')!

    const waitNode = createNode('wait', '等待2秒', { x: 200, y: 200 })
    ;(waitNode as any).duration = 2000

    const afterNode = createNode('action', '提示', { x: 200, y: 350 }) as WFPActionNode
    ;(afterNode as any).actionType = 'showToast'
    ;(afterNode as any).config = { title: '等待完成' }

    wf.nodes.push(waitNode, afterNode)
    wf.edges.push(
      createEdge(startNode.id, waitNode.id),
      createEdge(waitNode.id, afterNode.id),
      createEdge(afterNode.id, endNode.id),
    )

    const result = transformWorkflowToHandler(wf)
    expect(result.body).toContain('await new Promise(resolve => setTimeout(resolve, 2000))')
    expect(result.body).toContain('Taro.showToast')
  })

  it('generates event comment for wait node with event', () => {
    const wf = createWorkflow('waitEventFlow', 'interaction')
    const startNode = wf.nodes.find(n => n.type === 'start')!
    const endNode = wf.nodes.find(n => n.type === 'end')!

    const waitNode = createNode('wait', '等待确认', { x: 200, y: 200 })
    ;(waitNode as any).event = 'userConfirm'

    wf.nodes.push(waitNode)
    wf.edges.push(
      createEdge(startNode.id, waitNode.id),
      createEdge(waitNode.id, endNode.id),
    )

    const result = transformWorkflowToHandler(wf)
    expect(result.body).toContain('userConfirm')
    expect(result.body).toContain('// 等待事件')
  })

  it('generates await call for subprocess node', () => {
    const wf = createWorkflow('subFlow', 'interaction')
    const startNode = wf.nodes.find(n => n.type === 'start')!
    const endNode = wf.nodes.find(n => n.type === 'end')!

    const subNode = createNode('subprocess', '调用子流程', { x: 200, y: 200 })
    ;(subNode as any).workflowId = 'LoadUserProfile'

    wf.nodes.push(subNode)
    wf.edges.push(
      createEdge(startNode.id, subNode.id),
      createEdge(subNode.id, endNode.id),
    )

    const result = transformWorkflowToHandler(wf)
    expect(result.body).toContain('await handleLoadUserProfile()')
  })

  it('generates await call for executeWorkflow action', () => {
    const wf = createWorkflow('triggerFlow', 'interaction')
    const startNode = wf.nodes.find(n => n.type === 'start')!
    const endNode = wf.nodes.find(n => n.type === 'end')!

    const actionNode = createNode('action', '执行子流程', { x: 200, y: 200 }) as WFPActionNode
    ;(actionNode as any).actionType = 'executeWorkflow'
    ;(actionNode as any).config = { workflowId: 'SendNotification' }

    wf.nodes.push(actionNode)
    wf.edges.push(
      createEdge(startNode.id, actionNode.id),
      createEdge(actionNode.id, endNode.id),
    )

    const result = transformWorkflowToHandler(wf)
    expect(result.body).toContain('await handleSendNotification()')
  })

  it('generates warning comment for unknown node type', () => {
    const wf = createWorkflow('unknownFlow', 'interaction')
    const startNode = wf.nodes.find(n => n.type === 'start')!
    const endNode = wf.nodes.find(n => n.type === 'end')!

    // Manually inject an unknown node type
    const unknownNode = { id: 'u1', type: 'custom' as any, label: '自定义', position: { x: 0, y: 0 } }
    wf.nodes.push(unknownNode as any)
    wf.edges.push(
      createEdge(startNode.id, 'u1'),
      createEdge('u1', endNode.id),
    )

    const result = transformWorkflowToHandler(wf)
    expect(result.body).toContain('// ⚠ 节点类型 "custom" 暂不支持代码生成')
  })

  it('handles nested condition inside parallel branch', () => {
    const wf = createWorkflow('nestedFlow', 'data-orchestration')
    const startNode = wf.nodes.find(n => n.type === 'start')!
    const endNode = wf.nodes.find(n => n.type === 'end')!

    const parallelNode = createNode('parallel', '并行', { x: 200, y: 100 })

    // Branch A: condition node inside parallel
    const condNode = createNode('condition', '判断', { x: 100, y: 250 })
    ;(condNode as any).expression = 'flag'

    const trueAction = createNode('action', '真分支', { x: 50, y: 400 }) as WFPActionNode
    ;(trueAction as any).actionType = 'showToast'
    ;(trueAction as any).config = { title: '真' }

    const falseAction = createNode('action', '假分支', { x: 150, y: 400 }) as WFPActionNode
    ;(falseAction as any).actionType = 'showToast'
    ;(falseAction as any).config = { title: '假' }

    // Branch B: simple action
    const branchBAction = createNode('action', 'B分支', { x: 300, y: 250 }) as WFPActionNode
    ;(branchBAction as any).actionType = 'showToast'
    ;(branchBAction as any).config = { title: 'B' }

    // Convergence after parallel
    const finalAction = createNode('action', '最终', { x: 200, y: 500 }) as WFPActionNode
    ;(finalAction as any).actionType = 'showToast'
    ;(finalAction as any).config = { title: '完成' }

    wf.nodes.push(parallelNode, condNode, trueAction, falseAction, branchBAction, finalAction)
    wf.edges.push(
      createEdge(startNode.id, parallelNode.id),
      createEdge(parallelNode.id, condNode.id),
      createEdge(parallelNode.id, branchBAction.id),
      { ...createEdge(condNode.id, trueAction.id), condition: 'true', label: 'true' },
      { ...createEdge(condNode.id, falseAction.id), condition: 'false', label: 'false' },
      createEdge(trueAction.id, finalAction.id),
      createEdge(falseAction.id, finalAction.id),
      createEdge(branchBAction.id, finalAction.id),
      createEdge(finalAction.id, endNode.id),
    )

    const result = transformWorkflowToHandler(wf)
    expect(result.body).toContain('Promise.all')
    expect(result.body).toContain('if (flag)')
    expect(result.body).toContain('"真"')
    expect(result.body).toContain('"假"')
    expect(result.body).toContain('"B"')
  })
})
