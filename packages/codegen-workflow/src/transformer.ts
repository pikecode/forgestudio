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

  function visit(nodeId: string, indent: number): void {
    if (visited.has(nodeId)) return
    visited.add(nodeId)

    const node = schema.nodes.find(n => n.id === nodeId)
    if (!node || node.type === 'end') return

    const pad = '  '.repeat(indent)

    if (node.type === 'action') {
      const actionLines = generateActionLines(node as WFPActionNode, pad)
      lines.push(...actionLines)
      const outEdges = getEdgesByNode(schema, nodeId, 'outgoing')
      for (const edge of outEdges) {
        visit(edge.target, indent)
      }
    } else if (node.type === 'condition') {
      generateConditionBlock(node as WFPConditionNode, schema, indent, lines, visited)
    }
  }

  const startOutEdges = getEdgesByNode(schema, startNode.id, 'outgoing')
  for (const edge of startOutEdges) {
    visit(edge.target, 0)
  }

  const fnName = toCamelCase(schema.name)
  return {
    name: fnName,
    params: [],
    body: lines.join('\n'),
  }
}

function generateActionLines(node: WFPActionNode, pad: string): string[] {
  const { actionType, config, outputVar } = node
  const varDecl = outputVar ? `const ${outputVar} = ` : ''

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
    const setter = `set${capitalize(target)}`
    return [`${pad}${setter}(${value})`]
  }

  if (actionType === 'callApi') {
    const dsId = String(config.dataSourceId ?? 'api')
    return [
      `${pad}try {`,
      `${pad}  ${varDecl}await fetch_${dsId}()`,
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

function generateConditionBlock(
  node: WFPConditionNode,
  schema: WFPSchema,
  indent: number,
  lines: string[],
  visited: Set<string>
): void {
  const pad = '  '.repeat(indent)
  visited.add(node.id)
  const outEdges = getEdgesByNode(schema, node.id, 'outgoing')
  const trueEdge = outEdges.find(e => e.condition === 'true' || e.label === 'true')
  const falseEdge = outEdges.find(e => e.condition === 'false' || e.label === 'false')

  lines.push(`${pad}if (${node.expression}) {`)
  if (trueEdge) {
    const trueNode = schema.nodes.find(n => n.id === trueEdge.target)
    if (trueNode && trueNode.type === 'action') {
      const actionLines = generateActionLines(trueNode as WFPActionNode, pad + '  ')
      lines.push(...actionLines)
    }
  }
  lines.push(`${pad}} else {`)
  if (falseEdge) {
    const falseNode = schema.nodes.find(n => n.id === falseEdge.target)
    if (falseNode && falseNode.type === 'action') {
      const actionLines = generateActionLines(falseNode as WFPActionNode, pad + '  ')
      lines.push(...actionLines)
    }
  }
  lines.push(`${pad}}`)
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
