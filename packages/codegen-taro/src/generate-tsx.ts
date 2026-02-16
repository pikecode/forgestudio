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
  const hasEffects = ir.effects.length > 0
  const hasHandlers = ir.handlers.length > 0
  const needsReactHooks = hasState || hasEffects
  const needsTaro = hasEffects || hasHandlers

  let stateImport = ''
  if (needsReactHooks && needsTaro) {
    stateImport = `import { useState, useEffect } from 'react'\nimport Taro from '@tarojs/taro'\n`
  } else if (needsReactHooks) {
    stateImport = `import { useState, useEffect } from 'react'\n`
  } else if (needsTaro) {
    stateImport = `import Taro from '@tarojs/taro'\n`
  }

  const stateDecls = ir.stateVars.map(v => {
    const capitalizedName = v.name.charAt(0).toUpperCase() + v.name.slice(1)
    if (Array.isArray(v.defaultValue) && v.defaultValue.length > 0) {
      const items = v.defaultValue.map(item => '    ' + JSON.stringify(item))
      return `  const [${v.name}, set${capitalizedName}] = useState([\n${items.join(',\n')}\n  ])`
    }
    if (v.type === 'any[]') {
      return `  const [${v.name}, set${capitalizedName}] = useState([])`
    }
    // Form states with primitive types
    const defaultVal = v.defaultValue !== undefined
      ? (typeof v.defaultValue === 'string' ? `'${v.defaultValue}'` : v.defaultValue)
      : (v.type === 'number' ? 0 : v.type === 'boolean' ? false : "''")
    return `  const [${v.name}, set${capitalizedName}] = useState(${defaultVal})`
  }).join('\n')

  // Generate effects
  const effectsCode = ir.effects.map(e => {
    return `  useEffect(() => {\n    ${e.body}\n  }, [])`
  }).join('\n\n')

  // Generate handlers
  const handlersCode = ir.handlers.map(h => {
    const params = h.params || ''
    return `  const ${h.name} = (${params}) => {\n    ${h.body}\n  }`
  }).join('\n\n')

  const jsx = renderNode(ir.renderTree, 2)

  const bodyParts: string[] = []
  if (stateDecls) bodyParts.push(stateDecls)
  if (handlersCode) bodyParts.push(handlersCode)
  if (effectsCode) bodyParts.push(effectsCode)
  const bodyStr = bodyParts.length > 0 ? bodyParts.join('\n\n') + '\n\n' : ''

  // Generate extractList helper if there are data sources
  const extractListFn = hasState ? `
// 自动从接口响应中提取数组数据
// 支持: 直接数组、{ data: [] }、{ list: [] }、{ results: [] } 等格式
function extractList(data: any): any[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    for (const val of Object.values(data)) {
      if (Array.isArray(val)) return val
    }
  }
  return []
}
` : ''

  return `${stateImport}${importLine}
import './index.scss'
${extractListFn}
export default function Index() {
${bodyStr}  return (
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

  // Handle conditional rendering (M1.5)
  let nodeJSX = ''

  // Handle loop rendering
  if (node.loop) {
    const { dataVar, itemVar } = node.loop
    const childrenStr = node.children
      .map((child) => {
        if ('type' in child && child.type === 'text') {
          const text = child.value
          // Handle expressions in text: {{$item.title}} -> {item.title}
          if (text.includes('{{')) {
            const jsxExpr = text.replace(/\{\{([^}]+)\}\}/g, (_, expr) => {
              const cleaned = expr.trim().replace(/^\$/, '')
              return `{${cleaned}}`
            })
            return `${pad}    ${jsxExpr}`
          }
          return `${pad}    ${text}`
        }
        return renderNode(child as IRRenderNode, indent + 4)
      })
      .join('\n')

    nodeJSX = `${pad}{${dataVar}.map((${itemVar}, index) => (
${pad}  <${taroTag} key={index}${propsStr}>
${childrenStr}
${pad}  </${taroTag}>
${pad}))}`
  }
  // Self-closing if no children
  else if (node.children.length === 0) {
    nodeJSX = `${pad}<${taroTag}${propsStr} />`
  }
  // Children
  else {
    const childrenStr = node.children
      .map((child) => {
        if ('type' in child && child.type === 'text') {
          const text = child.value
          // Handle expressions in text: {{$item.title}} -> {item.title}
          if (text.includes('{{')) {
            const jsxExpr = text.replace(/\{\{([^}]+)\}\}/g, (_, expr) => {
              const cleaned = expr.trim().replace(/^\$/, '')
              return `{${cleaned}}`
            })
            return `${pad}  ${jsxExpr}`
          }
          return `${pad}  ${text}`
        }
        return renderNode(child as IRRenderNode, indent + 2)
      })
      .join('\n')

    nodeJSX = `${pad}<${taroTag}${propsStr}>\n${childrenStr}\n${pad}</${taroTag}>`
  }

  // Wrap with condition if present
  if (node.condition) {
    return `${pad}{${node.condition.expression} && (
${nodeJSX}
${pad})}`
  }

  return nodeJSX
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
