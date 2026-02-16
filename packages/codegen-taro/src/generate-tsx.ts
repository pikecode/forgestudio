import type {
  IRPage,
  IRRenderNode,
  IRTextContent,
} from '@forgestudio/codegen-core'
import { getTaroMapping } from './component-map'
import { mapProps } from './prop-map'

export function generateTSX(ir: IRPage): string {
  // Collect all unique Taro component imports
  const usedComponents = new Set<string>()
  collectTags(ir.renderTree, usedComponents)

  const componentImports = Array.from(usedComponents).sort()
  const importLine = `import { ${componentImports.join(', ')} } from '@tarojs/components'`

  // Generate state declarations
  const hasState = ir.stateVars.length > 0
  const stateImport = hasState ? `import { useState, useEffect } from 'react'\nimport Taro from '@tarojs/taro'\n` : ''

  const stateDecls = ir.stateVars.map(v => {
    const capitalizedName = v.name.charAt(0).toUpperCase() + v.name.slice(1)
    return `  const [${v.name}, set${capitalizedName}] = useState<${v.type}>([])`
  }).join('\n')

  // Generate effects
  const effectsCode = ir.effects.map(e => {
    return `  useEffect(() => {\n    ${e.body}\n  }, [])`
  }).join('\n\n')

  const jsx = renderNode(ir.renderTree, 2)

  return `${stateImport}${importLine}
import './index.scss'

export default function Index() {
${stateDecls}
${effectsCode ? '\n' + effectsCode + '\n' : ''}
  return (
${jsx}
  )
}
`
}

function collectTags(node: IRRenderNode, set: Set<string>) {
  const { taroTag } = getTaroMapping(node.tag)
  set.add(taroTag)
  for (const child of node.children) {
    if ('tag' in child) collectTags(child, set)
  }
}

function renderNode(node: IRRenderNode, indent: number): string {
  const pad = ' '.repeat(indent)
  const { taroTag } = getTaroMapping(node.tag)
  const propsStr = buildPropsString(taroTag, node)

  // Handle loop rendering
  if (node.loop) {
    const { dataVar, itemVar } = node.loop
    const childrenStr = node.children
      .map((child) => {
        if ('type' in child && child.type === 'text') {
          const text = child.value
          // Handle expressions in text
          if (text.includes('{{')) {
            const jsxExpr = text.replace(/\{\{([^}]+)\}\}/g, (_, expr) => `{${expr.trim()}}`)
            return `${pad}    ${jsxExpr}`
          }
          return `${pad}    ${text}`
        }
        return renderNode(child as IRRenderNode, indent + 4)
      })
      .join('\n')

    return `${pad}{${dataVar}.map((${itemVar}, index) => (
${pad}  <${taroTag} key={index}${propsStr}>
${childrenStr}
${pad}  </${taroTag}>
${pad}))}`
  }

  // Self-closing if no children
  if (node.children.length === 0) {
    return `${pad}<${taroTag}${propsStr} />`
  }

  // Children
  const childrenStr = node.children
    .map((child) => {
      if ('type' in child && child.type === 'text') {
        const text = child.value
        // Handle expressions in text
        if (text.includes('{{')) {
          const jsxExpr = text.replace(/\{\{([^}]+)\}\}/g, (_, expr) => `{${expr.trim()}}`)
          return `${pad}  ${jsxExpr}`
        }
        return `${pad}  ${text}`
      }
      return renderNode(child as IRRenderNode, indent + 2)
    })
    .join('\n')

  return `${pad}<${taroTag}${propsStr}>\n${childrenStr}\n${pad}</${taroTag}>`
}

function buildPropsString(taroTag: string, node: IRRenderNode): string {
  const parts: string[] = []
  if (node.className) {
    parts.push(`className="${node.className}"`)
  }
  const mapped = mapProps(taroTag, node.props)
  for (const [k, v] of Object.entries(mapped)) {
    parts.push(`${k}=${v}`)
  }
  return parts.length > 0 ? ' ' + parts.join(' ') : ''
}
