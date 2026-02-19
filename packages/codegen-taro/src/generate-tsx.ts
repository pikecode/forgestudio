import type {
  IRPage,
  IRRenderNode,
  IRTextContent,
  IRHandler,
} from '@forgestudio/codegen-core'
import { getTaroMapping } from './component-map'
import { mapProps } from './prop-map'

/** Convert FSP expression variables to JSX expression variables */
function convertExprVars(expr: string): string {
  return expr.trim()
    .replace(/\$state\.(\w+)/g, '$1')
    .replace(/\$item\.(\w+)/g, 'item.$1')
    // Handle data source field access: $ds.dataSourceId.fieldName -> dataSourceIdData?.fieldName
    .replace(/\$ds\.([^.]+)\.([^.\s}]+)/g, '$1Data?.$2')
    // Handle data source data access: $ds.dataSourceId.data -> dataSourceIdData
    .replace(/\$ds\.(\w+)\.data/g, '$1Data')
    .replace(/^\$/, '')  // fallback: strip leading $ for simple $item references
}

export function generateTSX(ir: IRPage): string {
  // Extract filename from page path (e.g., '/pages/detail/index' -> 'index')
  const scssFileName = ir.path.split('/').pop() || 'index'

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
      return `  const [${v.name}, set${capitalizedName}] = useState<any[]>([\n${items.join(',\n')}\n  ])`
    }
    if (v.type === 'any[]') {
      return `  const [${v.name}, set${capitalizedName}] = useState<any[]>([])`
    }
    // Object type (single item from sampleData)
    if (v.defaultValue !== null && typeof v.defaultValue === 'object') {
      return `  const [${v.name}, set${capitalizedName}] = useState<any>(${JSON.stringify(v.defaultValue, null, 2).split('\n').map((line, i) => i === 0 ? line : '  ' + line).join('\n')})`
    }
    // Form states with primitive types
    const defaultVal = v.defaultValue !== undefined
      ? (typeof v.defaultValue === 'string' ? `'${v.defaultValue}'` : v.defaultValue)
      : (v.type === 'number' ? 0 : v.type === 'boolean' ? false : "''")
    const typeAnnotation = v.type === 'string' ? '<string>' : v.type === 'number' ? '<number>' : v.type === 'boolean' ? '<boolean>' : ''
    return `  const [${v.name}, set${capitalizedName}] = useState${typeAnnotation}(${defaultVal})`
  }).join('\n')

  // Generate effects
  const effectsCode = ir.effects.map(e => {
    return `  useEffect(() => {\n    ${e.body}\n  }, [])`
  }).join('\n\n')

  // Generate handlers
  const handlersCode = ir.handlers.map(h => {
    const params = h.params || ''
    const paramType = h.params ? ': any' : ''
    return `  const ${h.name} = (${params}${paramType}) => {\n    ${h.body}\n  }`
  }).join('\n\n')

  const jsx = renderNode(ir.renderTree, 2, ir.handlers, false, 'item')

  const bodyParts: string[] = []
  if (stateDecls) bodyParts.push(stateDecls)
  if (handlersCode) bodyParts.push(handlersCode)
  if (effectsCode) bodyParts.push(effectsCode)
  const bodyStr = bodyParts.length > 0 ? bodyParts.join('\n\n') + '\n\n' : ''

  // Generate extractList helper if there are data sources with autoFetch
  const needsExtractList = ir.effects.some(e => e.body.includes('extractList'))
  const extractListFn = needsExtractList ? `
/**
 * Auto-extract array data from API response
 * Supports: direct array, { data: [] }, { list: [] }, { results: [] }, etc.
 */
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
import './${scssFileName}.scss'
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

function renderNode(node: IRRenderNode, indent: number, handlers: IRHandler[], insideLoop: boolean, itemVar: string): string {
  const pad = ' '.repeat(indent)
  const { taroTag } = getTaroMapping(node.tag)
  const propsStr = buildPropsString(taroTag, node, handlers, insideLoop, itemVar)

  // Handle conditional rendering (M1.5)
  let nodeJSX = ''

  // Handle loop rendering
  if (node.loop) {
    const { dataVar, itemVar } = node.loop
    const childrenStr = node.children
      .map((child) => {
        if ('type' in child && child.type === 'text') {
          const text = child.value
          // Handle expressions in text: {{$item.title}} -> {item.title}, {{$state.count}} -> {count}
          if (text.includes('{{')) {
            const jsxExpr = text.replace(/\{\{([^}]+)\}\}/g, (_, expr) => {
              return `{${convertExprVars(expr)}}`
            })
            return `${pad}    ${jsxExpr}`
          }
          return `${pad}    ${text}`
        }
        return renderNode(child as IRRenderNode, indent + 4, handlers, true, itemVar)
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
          // Handle expressions in text: {{$item.title}} -> {item.title}, {{$state.count}} -> {count}
          if (text.includes('{{')) {
            const jsxExpr = text.replace(/\{\{([^}]+)\}\}/g, (_, expr) => {
              return `{${convertExprVars(expr)}}`
            })
            return `${pad}  ${jsxExpr}`
          }
          return `${pad}  ${text}`
        }
        return renderNode(child as IRRenderNode, indent + 2, handlers, insideLoop, itemVar)
      })
      .join('\n')

    nodeJSX = `${pad}<${taroTag}${propsStr}>\n${childrenStr}\n${pad}</${taroTag}>`
  }

  // Wrap with condition if present (supports complex expressions)
  if (node.condition) {
    const jsxCondition = convertExprVars(node.condition.expression)

    return `${pad}{${jsxCondition} && (
${nodeJSX}
${pad})}`
  }

  return nodeJSX
}

function buildPropsString(taroTag: string, node: IRRenderNode, handlers: IRHandler[], insideLoop: boolean, itemVar: string): string {
  const parts: string[] = []
  if (node.className) {
    parts.push(`className="${node.className}"`)
  }
  const mapped = mapProps(taroTag, node.props)
  for (const [k, v] of Object.entries(mapped)) {
    // Check if this is an event handler that needs item parameter
    const propValue = node.props[k]
    if (propValue && propValue.type === 'identifier' && insideLoop) {
      const handler = handlers.find(h => h.name === propValue.name)
      // If handler has 'item' parameter, wrap it in arrow function
      if (handler && handler.params && handler.params.includes('item')) {
        parts.push(`${k}={() => ${propValue.name}(${itemVar})}`)
        continue
      }
    }
    parts.push(`${k}=${v}`)
  }
  return parts.length > 0 ? ' ' + parts.join(' ') : ''
}
