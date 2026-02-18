import type { ComponentNode, FSPSchema, Action, DataSourceDef, PageDef } from '@forgestudio/protocol'
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
 * Transform a single page definition to IR
 */
function transformPageToIR(schema: FSPSchema, pageDef: PageDef): IRPage {
  const styleRules: IRStyleRule[] = []
  const stateVars: IRStateVar[] = []
  const effects: IREffect[] = []
  const handlers: IRHandler[] = []
  let handlerCounter = 0

  // Sort data sources by dependency (M2)
  const sortedDataSources = sortDataSourcesByDependency(schema.dataSources ?? [])

  // Generate state vars and effects from data sources
  for (const ds of sortedDataSources) {
    const varName = `${ds.id}Data`
    const raw = ds.mockData as any
    const mockData = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []
    stateVars.push({
      name: varName,
      type: 'any[]',
      defaultValue: mockData,
    })

    if (ds.autoFetch) {
      const capitalizedName = varName.charAt(0).toUpperCase() + varName.slice(1)

      // Build dependency wait logic if needed
      let dependencyCheck = ''
      if (ds.dependsOn && ds.dependsOn.length > 0) {
        const depChecks = ds.dependsOn.map(depId => `${depId}Data.length > 0`).join(' && ')
        dependencyCheck = `if (!(${depChecks})) return\n    `
      }

      effects.push({
        trigger: 'mount',
        body: `${dependencyCheck}Taro.request({ url: '${ds.options.url}', method: '${ds.options.method}' })\n      .then(res => {\n        const list = extractList(res.data)\n        if (list.length) set${capitalizedName}(list)\n      })\n      .catch(err => {\n        console.error('Failed to fetch ${ds.id}:', err)\n      })`,
      })
    }
  }

  // Generate state vars from form states
  for (const fs of schema.formStates ?? []) {
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
        case 'navigate':
          return `Taro.navigateTo({ url: '${action.url}' })`
        case 'showToast':
          return `Taro.showToast({ title: '${action.title}', icon: '${action.icon || 'success'}' })`
        case 'setState':
          return `set${action.target.charAt(0).toUpperCase() + action.target.slice(1)}(${action.value})`
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

    // Text content from props (expressions are preserved as-is for codegen)
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

    // Handle events - generate handlers and add to props
    if (node.events) {
      for (const [eventName, actions] of Object.entries(node.events)) {
        if (actions.length > 0) {
          handlerCounter++
          const handlerName = `handle${eventName.charAt(0).toUpperCase() + eventName.slice(1)}${handlerCounter}`
          const handlerBody = generateHandlerBody(actions)
          const needsEvent = needsEventParam(actions)

          handlers.push({
            name: handlerName,
            params: needsEvent ? 'e' : undefined,
            body: handlerBody,
          })

          // Add handler reference to props
          irProps[eventName] = { type: 'identifier', name: handlerName }
        }
      }
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
