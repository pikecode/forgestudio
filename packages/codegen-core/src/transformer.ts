import type { ComponentNode, FSPSchema, Action, DataSourceDef, PageDef } from '@forgestudio/protocol'
import { getEffectiveDataSources } from '@forgestudio/protocol'
import type {
  IRProject,
  IRPage,
  IRRenderNode,
  IRTextContent,
  IRStyleSheet,
  IRStyleRule,
  IRStateVar,
  IREffect,
  IRHandler,
} from './ir'
import { camelToKebab, formatStyleValue } from './style-utils'

/**
 * Transform FSP schema to IR project (supports multi-page)
 */
export function transformFSPtoIR(schema: FSPSchema): IRProject {
  const pages: IRPage[] = []

  // Handle multi-page schema (M3)
  if (schema.pages && schema.pages.length > 0) {
    for (const pageDef of schema.pages) {
      pages.push(transformPageToIR(schema, pageDef))
    }
  } else {
    // Backward compatibility: single page from componentTree
    const defaultPage: PageDef = {
      id: 'page_index',
      name: 'index',
      title: schema.meta.name || 'Index',
      path: '/pages/index/index',
      componentTree: schema.componentTree,
    }
    pages.push(transformPageToIR(schema, defaultPage))
  }

  return {
    pages,
    appName: schema.meta.name || 'ForgeStudio App',
  }
}

/**
 * Sanitize ID to valid JavaScript variable name
 * Removes non-alphanumeric characters and ensures valid identifier
 * Uses stable hash for non-ASCII characters to ensure consistency
 */
function sanitizeVarName(id: string): string {
  // Remove non-alphanumeric characters (except underscore)
  let sanitized = id.replace(/[^\w]/g, '_')

  // Ensure doesn't start with number
  if (/^\d/.test(sanitized)) {
    sanitized = '_' + sanitized
  }

  // If empty or only underscores, use stable hash of original ID
  if (!sanitized || /^_+$/.test(sanitized)) {
    // Simple hash function for consistent results
    let hash = 0
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    sanitized = 'ds_' + Math.abs(hash).toString(36)
  }

  return sanitized
}

/**
 * Topological sort for data sources based on dependencies
 * Returns sorted array where dependencies come before dependents
 */
function sortDataSourcesByDependency(dataSources: DataSourceDef[]): DataSourceDef[] {
  const sorted: DataSourceDef[] = []
  const visited = new Set<string>()
  const visiting = new Set<string>()

  function visit(ds: DataSourceDef) {
    if (visited.has(ds.id)) return
    if (visiting.has(ds.id)) {
      // Circular dependency detected - just skip
      console.warn(`Circular dependency detected for data source: ${ds.id}`)
      return
    }

    visiting.add(ds.id)

    // Visit dependencies first
    if (ds.dependsOn) {
      for (const depId of ds.dependsOn) {
        const depDs = dataSources.find(d => d.id === depId)
        if (depDs) {
          visit(depDs)
        }
      }
    }

    visiting.delete(ds.id)
    visited.add(ds.id)
    sorted.push(ds)
  }

  for (const ds of dataSources) {
    visit(ds)
  }

  return sorted
}

/**
 * Collect all data source IDs referenced in a component tree
 */
function collectReferencedDataSources(node: ComponentNode): Set<string> {
  const refs = new Set<string>()

  // Check loop binding
  if (node.loop?.dataSourceId) {
    refs.add(node.loop.dataSourceId)
  }

  // Check props for $ds.xxx references
  for (const [key, value] of Object.entries(node.props)) {
    if (typeof value === 'string') {
      // Match {{$ds.xxx.data}} or similar patterns
      // Use [^.\s}]+ to match any characters including Chinese
      const matches = value.matchAll(/\{\{\$ds\.([^.\s}]+)\./g)
      for (const match of matches) {
        refs.add(match[1])
      }
    }
  }

  // Recurse children
  for (const child of node.children ?? []) {
    const childRefs = collectReferencedDataSources(child)
    childRefs.forEach(ref => refs.add(ref))
  }

  return refs
}

/**
 * Transform a single page definition to IR
 */
function transformPageToIR(schema: FSPSchema, pageDef: PageDef): IRPage {
  const styleRules: IRStyleRule[] = []
  const stateVars: IRStateVar[] = []
  const effects: IREffect[] = []
  const handlers: IRHandler[] = []
  let handlerCounter = 0

  // Collect referenced data sources for this page
  const referencedDataSourceIds = collectReferencedDataSources(pageDef.componentTree)

  // M4: Use page-level dataSources + global data sources (Area 2)
  const pageDataSources = getEffectiveDataSources(schema, pageDef.id)

  // Sort data sources by dependency (M2) and filter to only referenced ones
  const sortedDataSources = sortDataSourcesByDependency(pageDataSources)
    .filter(ds => referencedDataSourceIds.has(ds.id))

  // Generate state vars and effects from data sources
  for (const ds of sortedDataSources) {
    const varName = `${sanitizeVarName(ds.id)}Data`
    const sampleData = ds.sampleData ?? []
    const isObjectType = ds.dataType === 'object'

    stateVars.push({
      name: varName,
      type: isObjectType ? 'any' : 'any[]',
      defaultValue: isObjectType ? (Array.isArray(sampleData) ? sampleData[0] : sampleData) : sampleData,
    })

    if (ds.autoFetch) {
      const capitalizedName = varName.charAt(0).toUpperCase() + varName.slice(1)

      // Build dependency wait logic if needed
      let dependencyCheck = ''
      if (ds.dependsOn && ds.dependsOn.length > 0) {
        const depChecks = ds.dependsOn.map(depId => {
          const depDs = sortedDataSources.find(d => d.id === depId)
          if (depDs?.dataType === 'object') {
            return `${sanitizeVarName(depId)}Data`
          } else {
            return `${sanitizeVarName(depId)}Data.length > 0`
          }
        }).join(' && ')
        dependencyCheck = `if (!(${depChecks})) return\n    `
      }

      // Transform URL templates with $param
      let urlExpr = ds.options.url
      let paramsDecl = ''
      if (urlExpr.includes('{{$param.')) {
        // Convert {{$param.xxx}} to ${params.xxx}
        urlExpr = urlExpr.replace(/\{\{\$param\.(\w+)\}\}/g, '${params.$1}')
        urlExpr = `\`${urlExpr}\``
        paramsDecl = `const params = Taro.getCurrentInstance().router?.params || {}\n    `
      } else {
        urlExpr = `'${urlExpr}'`
      }

      // Generate different logic for object vs array
      let fetchBody: string
      if (isObjectType) {
        // Object type: directly set response data
        fetchBody = `${dependencyCheck}${paramsDecl}Taro.request({ url: ${urlExpr}, method: '${ds.options.method}' })\n      .then(res => {\n        if (res.data) set${capitalizedName}(res.data)\n      })\n      .catch(err => {\n        console.error('Failed to fetch ${ds.id}:', err)\n      })`
      } else {
        // Array type: use extractList helper
        fetchBody = `${dependencyCheck}${paramsDecl}Taro.request({ url: ${urlExpr}, method: '${ds.options.method}' })\n      .then(res => {\n        const list = extractList(res.data)\n        if (list.length) set${capitalizedName}(list)\n      })\n      .catch(err => {\n        console.error('Failed to fetch ${ds.id}:', err)\n      })`
      }

      // Build dependency list for useEffect
      const effectDeps: string[] = []
      if (ds.dependsOn && ds.dependsOn.length > 0) {
        for (const depId of ds.dependsOn) {
          effectDeps.push(`${sanitizeVarName(depId)}Data`)
        }
      }

      effects.push({
        trigger: 'mount',
        body: fetchBody,
        dependencies: effectDeps.length > 0 ? effectDeps : undefined,
      })
    }
  }

  // Generate state vars from form states
  // M4: Use page-level formStates with fallback to global for backward compatibility
  const pageFormStates = pageDef.formStates ?? schema.formStates ?? []
  for (const fs of pageFormStates) {
    stateVars.push({
      name: fs.id,
      type: fs.type === 'number' ? 'number' : fs.type === 'boolean' ? 'boolean' : 'string',
      defaultValue: fs.defaultValue ?? (fs.type === 'number' ? 0 : fs.type === 'boolean' ? false : ''),
    })
  }

  // Helper to generate handler body from actions
  function generateHandlerBody(actions: Action[]): string {
    const statements = actions.map(action => {
      switch (action.type) {
        case 'navigate': {
          // Build query string from params
          if (action.params && Object.keys(action.params).length > 0) {
            const paramPairs = Object.entries(action.params)
              .map(([key, value]) => {
                // Transform {{$item.xxx}} -> ${item.xxx}
                let expr = String(value)
                if (expr.startsWith('{{') && expr.endsWith('}}')) {
                  expr = expr.slice(2, -2).trim()
                    .replace(/^\$item\./, 'item.')
                    .replace(/^\$state\./, '')
                  // Use ${} syntax for template string interpolation
                  return `${key}=\${${expr}}`
                } else {
                  // Static value
                  return `${key}=${expr}`
                }
              })
              .join('&')
            return `Taro.navigateTo({ url: \`${action.url}?${paramPairs}\` })`
          } else {
            return `Taro.navigateTo({ url: '${action.url}' })`
          }
        }
        case 'showToast':
          return `Taro.showToast({ title: '${action.title}', icon: '${action.icon || 'success'}' })`
        case 'setState': {
          // Find target variable type for type conversion
          const targetState = pageFormStates.find(fs => fs.id === action.target)
          let valueExpr = action.value

          // Add type conversion if needed
          if (targetState?.type === 'number' && !valueExpr.includes('Number(')) {
            valueExpr = `Number(${valueExpr})`
          } else if (targetState?.type === 'boolean' && !valueExpr.includes('Boolean(')) {
            valueExpr = `Boolean(${valueExpr})`
          }

          return `set${action.target.charAt(0).toUpperCase() + action.target.slice(1)}(${valueExpr})`
        }
        case 'submitForm':
          const dataObj = action.fields.map(f => `      ${f}`).join(',\n')
          return `e.preventDefault()
    Taro.request({
      url: '${action.url}',
      method: '${action.method}',
      data: {
${dataObj}
      }
    })
      .then(() => {
        Taro.showToast({ title: '${action.successMessage || '提交成功'}', icon: 'success' })
      })
      .catch((err) => {
        console.error('Form submission failed:', err)
        Taro.showToast({ title: '${action.errorMessage || '提交失败'}', icon: 'error' })
      })`
        default:
          return ''
      }
    }).filter(Boolean)
    return statements.join('\n    ')
  }

  // Check if handler needs event parameter (e.g., onChange with e.detail.value)
  function needsEventParam(actions: Action[]): boolean {
    return actions.some(action =>
      (action.type === 'setState' && action.value.includes('e.detail')) ||
      action.type === 'submitForm'
    )
  }

  // Check if handler references $item (loop item variable)
  function needsItemParam(actions: Action[]): boolean {
    return actions.some(action => {
      if (action.type === 'navigate' && action.params) {
        return Object.values(action.params).some(v => String(v).includes('$item'))
      }
      return false
    })
  }

  // Sanitize expressions: replace data source IDs with sanitized versions
  // e.g., {{$ds.详情接口.id}} -> {{$ds.___.id}}
  function sanitizeExpression(expr: string): string {
    if (!expr.includes('$ds.')) return expr

    // Match $ds.xxx.yyy pattern and replace xxx with sanitized version
    return expr.replace(/\$ds\.([^.}]+)/g, (match, dsId) => {
      return `$ds.${sanitizeVarName(dsId)}`
    })
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

    // Text content from props (expressions are sanitized for data source IDs)
    if (node.component === 'Text' && node.props.content) {
      const content = String(node.props.content)
      children.push({ type: 'text', value: sanitizeExpression(content) })
    }
    if (node.component === 'Button' && node.props.text) {
      const text = String(node.props.text)
      children.push({ type: 'text', value: sanitizeExpression(text) })
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
      // Sanitize expressions in prop values
      const sanitizedVal = typeof val === 'string' ? sanitizeExpression(val) : val
      irProps[key] = { type: 'literal', value: sanitizedVal }
    }

    // Handle events - generate handlers and add to props
    if (node.events) {
      for (const [eventName, actions] of Object.entries(node.events)) {
        if (actions.length > 0) {
          handlerCounter++
          const handlerName = `handle${eventName.charAt(0).toUpperCase() + eventName.slice(1)}${handlerCounter}`
          const handlerBody = generateHandlerBody(actions)
          const needsEvent = needsEventParam(actions)
          const needsItem = needsItemParam(actions)

          // Determine params: prioritize event param, then item param
          let params = needsEvent ? 'e' : needsItem ? 'item' : undefined
          if (needsEvent && needsItem) {
            params = 'item, e'  // Both needed (rare case)
          }

          handlers.push({
            name: handlerName,
            params,
            body: handlerBody,
          })

          // Add handler reference to props
          // Mark if needs item wrapping in TSX generation
          irProps[eventName] = {
            type: 'identifier',
            name: handlerName,
            ...(needsItem && { needsItemWrapper: true })
          }
        }
      }
    }

    // Determine tag — Page becomes View (root wrapper)
    const tag = node.component === 'Page' ? 'View' : node.component

    // Handle loop
    let loopInfo: IRRenderNode['loop'] = undefined
    if (node.loop) {
      const dataVar = `${sanitizeVarName(node.loop.dataSourceId)}Data`
      const itemVar = node.loop.itemName || 'item'
      loopInfo = { dataVar, itemVar }
    }

    // Handle condition (M1.5)
    let conditionInfo: IRRenderNode['condition'] = undefined
    if (node.condition) {
      // Extract variable name from {{varName}} syntax
      let expr = node.condition.expression
      if (expr.startsWith('{{') && expr.endsWith('}}')) {
        expr = expr.slice(2, -2).trim()
      }
      conditionInfo = { expression: expr }
    }

    return {
      tag,
      props: irProps,
      children,
      className: node.id,
      loop: loopInfo,
      condition: conditionInfo,
    }
  }

  const renderTree = transformNode(pageDef.componentTree)!

  return {
    id: pageDef.id,
    name: pageDef.name,
    title: pageDef.title,
    path: pageDef.path,
    imports: [],       // filled by the codegen plugin
    stateVars,
    effects,
    handlers,
    renderTree,
    styles: { rules: styleRules },
  }
}
