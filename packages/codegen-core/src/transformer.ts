import type { ComponentNode, FSPSchema } from '@forgestudio/protocol'
import type {
  IRPage,
  IRRenderNode,
  IRTextContent,
  IRStyleSheet,
  IRStyleRule,
} from './ir'
import { camelToKebab, formatStyleValue } from './style-utils'

export function transformFSPtoIR(schema: FSPSchema): IRPage {
  const styleRules: IRStyleRule[] = []

  function transformNode(node: ComponentNode): IRRenderNode | null {
    // Collect styles into stylesheet
    const properties: Record<string, string> = {}
    for (const [prop, value] of Object.entries(node.styles)) {
      const formatted = formatStyleValue(prop, value)
      if (formatted !== null) {
        properties[camelToKebab(prop)] = formatted
      }
    }
    if (Object.keys(properties).length > 0) {
      styleRules.push({ selector: `.${node.id}`, properties })
    }

    // Build children
    const children: (IRRenderNode | IRTextContent)[] = []

    // Text content from props
    if (node.component === 'Text' && node.props.content) {
      children.push({ type: 'text', value: String(node.props.content) })
    }
    if (node.component === 'Button' && node.props.text) {
      children.push({ type: 'text', value: String(node.props.text) })
    }

    // Recurse children
    for (const child of node.children ?? []) {
      const irChild = transformNode(child)
      if (irChild) children.push(irChild)
    }

    // Build props (excluding content/text which became children)
    const irProps: Record<string, any> = {}
    for (const [key, val] of Object.entries(node.props)) {
      if (node.component === 'Text' && key === 'content') continue
      if (node.component === 'Button' && key === 'text') continue
      irProps[key] = { type: 'literal', value: val }
    }

    // Determine tag — Page becomes View (root wrapper)
    const tag = node.component === 'Page' ? 'View' : node.component

    return {
      tag,
      props: irProps,
      children,
      className: node.id,
    }
  }

  const renderTree = transformNode(schema.componentTree)!

  return {
    name: schema.meta.name || 'index',
    imports: [],       // filled by the codegen plugin
    stateVars: [],
    effects: [],
    handlers: [],
    renderTree,
    styles: { rules: styleRules },
  }
}
