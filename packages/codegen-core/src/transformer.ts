import type { ComponentNode, FSPSchema } from '@forgestudio/protocol'
import type {
  IRPage,
  IRRenderNode,
  IRTextContent,
  IRStyleSheet,
  IRStyleRule,
  IRStateVar,
  IREffect,
} from './ir'
import { camelToKebab, formatStyleValue } from './style-utils'

export function transformFSPtoIR(schema: FSPSchema): IRPage {
  const styleRules: IRStyleRule[] = []
  const stateVars: IRStateVar[] = []
  const effects: IREffect[] = []

  // Generate state vars and effects from data sources
  for (const ds of schema.dataSources ?? []) {
    const varName = `${ds.id}Data`
    stateVars.push({
      name: varName,
      type: 'any[]',
      defaultValue: [],
    })

    if (ds.autoFetch) {
      const capitalizedName = varName.charAt(0).toUpperCase() + varName.slice(1)
      effects.push({
        trigger: 'mount',
        body: `Taro.request({ url: '${ds.options.url}', method: '${ds.options.method}' }).then(res => set${capitalizedName}(res.data.data || []))`,
      })
    }
  }

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

    // Text content from props (handle expressions)
    if (node.component === 'Text' && node.props.content) {
      const content = String(node.props.content)
      if (content.includes('{{')) {
        // Expression binding - will be handled by Taro generator
        children.push({ type: 'text', value: content })
      } else {
        children.push({ type: 'text', value: content })
      }
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

    // Handle loop
    let loopInfo: IRRenderNode['loop'] = undefined
    if (node.loop) {
      const dataVar = `${node.loop.dataSourceId}Data`
      const itemVar = node.loop.itemName || 'item'
      loopInfo = { dataVar, itemVar }
    }

    return {
      tag,
      props: irProps,
      children,
      className: node.id,
      loop: loopInfo,
    }
  }

  const renderTree = transformNode(schema.componentTree)!

  return {
    name: schema.meta.name || 'index',
    imports: [],       // filled by the codegen plugin
    stateVars,
    effects,
    handlers: [],
    renderTree,
    styles: { rules: styleRules },
  }
}
