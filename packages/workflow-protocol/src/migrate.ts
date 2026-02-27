import type { WFPSchema, WFPActionNode } from './types'
import { createWorkflow, createNode, createEdge } from './utils'

/**
 * Migrate a linear Action[] array to a WFP workflow schema.
 * submitForm → callApi, all other types map directly.
 */
export function migrateActionsToWorkflow(
  actions: Array<{ type: string; [key: string]: unknown }>,
  eventName: string
): WFPSchema {
  const wf = createWorkflow(`${eventName}流程`, 'interaction')
  const startNode = wf.nodes.find(n => n.type === 'start')!
  const endNode = wf.nodes.find(n => n.type === 'end')!

  let prevNodeId = startNode.id

  for (const action of actions) {
    const actionType = mapActionType(action.type)
    const actionNode = createNode('action', actionLabel(action.type), {
      x: 200,
      y: 200 + wf.nodes.length * 80,
    }) as WFPActionNode
    ;(actionNode as any).actionType = actionType
    ;(actionNode as any).config = buildConfig(action)
    wf.nodes.push(actionNode)
    wf.edges.push(createEdge(prevNodeId, actionNode.id))
    prevNodeId = actionNode.id

    // Handle submitForm.onSuccess chaining
    if (action.type === 'submitForm' && Array.isArray(action.onSuccess)) {
      for (const successAction of action.onSuccess as Array<{
        type: string
        [key: string]: unknown
      }>) {
        const successType = mapActionType(successAction.type)
        const successNode = createNode('action', actionLabel(successAction.type), {
          x: 200,
          y: 200 + wf.nodes.length * 80,
        }) as WFPActionNode
        ;(successNode as any).actionType = successType
        ;(successNode as any).config = buildConfig(successAction)
        wf.nodes.push(successNode)
        wf.edges.push(createEdge(prevNodeId, successNode.id))
        prevNodeId = successNode.id
      }
    }
  }

  wf.edges.push(createEdge(prevNodeId, endNode.id))
  return wf
}

function mapActionType(type: string): string {
  if (type === 'submitForm') return 'callApi'
  if (type === 'navigate') return 'navigate'
  if (type === 'showToast') return 'showToast'
  if (type === 'setState') return 'setState'
  return 'showToast'
}

function actionLabel(type: string): string {
  const labels: Record<string, string> = {
    navigate: '页面跳转',
    showToast: '显示提示',
    setState: '设置状态',
    submitForm: 'API调用',
  }
  return labels[type] ?? type
}

function buildConfig(action: Record<string, unknown>): Record<string, unknown> {
  const { type, onSuccess, ...rest } = action
  return rest
}
