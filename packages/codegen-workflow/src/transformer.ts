import type { WFPSchema, WFPActionNode, WFPConditionNode } from '@forgestudio/workflow-protocol'
import { getEdgesByNode } from '@forgestudio/workflow-protocol'

export interface WorkflowHandler {
  /** Function name (camelCase) */
  name: string
  /** async function body (without the async function declaration) */
  body: string
  /** Parameter list */
  params: string[]
}

/** Convert WFP Schema to a Taro async handler function */
export function transformWorkflowToHandler(schema: WFPSchema): WorkflowHandler {
  const startNode = schema.nodes.find(n => n.type === 'start')
  if (!startNode) throw new Error(`Workflow "${schema.name}" has no start node`)

  const lines: string[] = []
  const visited = new Set<string>()

  function visit(nodeId: string, indent: number, stopAt?: string): void {
    if (visited.has(nodeId)) return
    if (stopAt !== undefined && nodeId === stopAt) return
    visited.add(nodeId)

    const node = schema.nodes.find(n => n.id === nodeId)
    if (!node || node.type === 'end') return

    const pad = '  '.repeat(indent)

    if (node.type === 'action') {
      lines.push(...generateActionLines(node as WFPActionNode, pad))
      for (const edge of getEdgesByNode(schema, nodeId, 'outgoing')) {
        visit(edge.target, indent, stopAt)
      }
    } else if (node.type === 'condition') {
      const condNode = node as WFPConditionNode
      const outEdges = getEdgesByNode(schema, nodeId, 'outgoing')
      const trueEdge = outEdges.find(e => e.condition === 'true' || e.label === 'true')
      const falseEdge = outEdges.find(e => e.condition === 'false' || e.label === 'false')

      // Find where both branches converge so we can continue after the if/else
      const convergence =
        trueEdge && falseEdge
          ? findConvergence(schema, trueEdge.target, falseEdge.target)
          : undefined

      lines.push(`${pad}if (${condNode.expression}) {`)
      if (trueEdge) visit(trueEdge.target, indent + 1, convergence)
      lines.push(`${pad}} else {`)
      if (falseEdge) visit(falseEdge.target, indent + 1, convergence)
      lines.push(`${pad}}`)

      if (convergence) visit(convergence, indent, stopAt)
    }
  }

  for (const edge of getEdgesByNode(schema, startNode.id, 'outgoing')) {
    visit(edge.target, 0)
  }

  return {
    name: toCamelCase(schema.name),
    params: [],
    body: lines.join('\n'),
  }
}

/**
 * BFS from both branch targets to find the first node reachable from both.
 * This is the post-condition convergence point.
 */
function findConvergence(schema: WFPSchema, trueTarget: string, falseTarget: string): string | undefined {
  const trueReachable = new Set<string>()
  const queue = [trueTarget]
  while (queue.length) {
    const id = queue.shift()!
    if (trueReachable.has(id)) continue
    trueReachable.add(id)
    for (const e of getEdgesByNode(schema, id, 'outgoing')) queue.push(e.target)
  }

  const falseQueue = [falseTarget]
  const falseVisited = new Set<string>()
  while (falseQueue.length) {
    const id = falseQueue.shift()!
    if (falseVisited.has(id)) continue
    falseVisited.add(id)
    if (trueReachable.has(id)) return id
    for (const e of getEdgesByNode(schema, id, 'outgoing')) falseQueue.push(e.target)
  }
  return undefined
}

function generateActionLines(node: WFPActionNode, pad: string): string[] {
  const { actionType, config, outputVar } = node

  if (actionType === 'showToast') {
    const title = JSON.stringify(config.title ?? '')
    const icon = JSON.stringify(config.icon ?? 'none')
    return [`${pad}await Taro.showToast({ title: ${title}, icon: ${icon} })`]
  }

  if (actionType === 'navigate') {
    const url = JSON.stringify(config.url ?? '')
    return [`${pad}await Taro.navigateTo({ url: ${url} })`]
  }

  if (actionType === 'setState') {
    const target = String(config.target ?? '')
    const value = String(config.value ?? '')
    return [`${pad}set${capitalize(target)}(${value})`]
  }

  if (actionType === 'callApi') {
    const dsId = String(config.dataSourceId ?? 'api')
    if (outputVar) {
      // Declare outside try so the variable is accessible after the block
      return [
        `${pad}let ${outputVar}`,
        `${pad}try {`,
        `${pad}  ${outputVar} = await fetch_${dsId}()`,
        `${pad}} catch (error) {`,
        `${pad}  throw new Error('API 调用失败')`,
        `${pad}}`,
      ]
    }
    return [
      `${pad}try {`,
      `${pad}  await fetch_${dsId}()`,
      `${pad}} catch (error) {`,
      `${pad}  throw new Error('API 调用失败')`,
      `${pad}}`,
    ]
  }

  if (actionType === 'validateForm') {
    return [
      `${pad}const isValid = validateForm()`,
      `${pad}if (!isValid) return`,
    ]
  }

  return [`${pad}// TODO: unknown action type "${actionType}"`]
}

function toCamelCase(str: string): string {
  const sanitized = str.replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s_-]/g, '')
  const words = sanitized.split(/[\s_-]+/)
  if (words.length === 0) return 'workflow'
  return (
    words
      .map((word, i) => {
        if (!word) return ''
        return i === 0
          ? word.charAt(0).toLowerCase() + word.slice(1)
          : word.charAt(0).toUpperCase() + word.slice(1)
      })
      .join('') || 'workflow'
  )
}

function capitalize(str: string): string {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}
