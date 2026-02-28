import type { ComponentNode, FSPSchema, Action, DataSourceDef, PageDef, WorkflowRef } from '@forgestudio/protocol'
import { getEffectiveDataSources, findNodeById } from '@forgestudio/protocol'
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

    // Add loading state for data sources with autoFetch
    if (ds.autoFetch) {
      stateVars.push({
        name: `${sanitizeVarName(ds.id)}Loading`,
        type: 'boolean',
        defaultValue: false,
      })
    }

    // Add page state for paginated data sources
    if (ds.pagination) {
      stateVars.push({
        name: `${sanitizeVarName(ds.id)}Page`,
        type: 'number',
        defaultValue: 1,
      })
      stateVars.push({
        name: `${sanitizeVarName(ds.id)}HasMore`,
        type: 'boolean',
        defaultValue: true,
      })
    }

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

      // Add pagination parameters if configured
      if (ds.pagination) {
        const pageParam = ds.pagination.pageParam || 'page'
        const sizeParam = ds.pagination.sizeParam || 'pageSize'
        const pageVar = `${sanitizeVarName(ds.id)}Page`
        const separator = urlExpr.includes('?') ? '&' : '?'

        if (urlExpr.startsWith("'")) {
          // Static URL
          urlExpr = `'${urlExpr.slice(1, -1)}${separator}${pageParam}=' + ${pageVar} + '&${sizeParam}=${ds.pagination.pageSize}'`
        } else {
          // Template URL
          urlExpr = `${urlExpr.slice(0, -1)}${separator}${pageParam}=\${${pageVar}}&${sizeParam}=${ds.pagination.pageSize}\``
        }
      }

      // Generate different logic for object vs array
      let fetchBody: string
      // Build header object if headers are configured
      const headerExpr = ds.options.headers && Object.keys(ds.options.headers).length > 0
        ? `, header: ${JSON.stringify(ds.options.headers)}`
        : ''
      if (isObjectType) {
        // Object type: directly set response data
        fetchBody = `${dependencyCheck}${paramsDecl}set${capitalizedName.replace('Data', 'Loading')}(true)\n    Taro.request({ url: ${urlExpr}, method: '${ds.options.method}'${headerExpr} })\n      .then(res => {\n        if (res.data) set${capitalizedName}(res.data)\n      })\n      .catch(err => {\n        console.error('Failed to fetch ${ds.id}:', err)\n        Taro.showToast({ title: '加载失败', icon: 'error' })\n      })\n      .finally(() => {\n        set${capitalizedName.replace('Data', 'Loading')}(false)\n      })`
      } else {
        // Array type: use extractList helper
        if (ds.pagination) {
          // Paginated: append data and update hasMore flag
          const pageVar = `${sanitizeVarName(ds.id)}Page`
          const hasMoreVar = `${sanitizeVarName(ds.id)}HasMore`
          fetchBody = `${dependencyCheck}${paramsDecl}set${capitalizedName.replace('Data', 'Loading')}(true)\n    Taro.request({ url: ${urlExpr}, method: '${ds.options.method}'${headerExpr} })\n      .then(res => {\n        const list = extractList(res.data)\n        if (${pageVar} === 1) {\n          set${capitalizedName}(list)\n        } else {\n          set${capitalizedName}(prev => [...prev, ...list])\n        }\n        set${hasMoreVar.charAt(0).toUpperCase() + hasMoreVar.slice(1)}(list.length >= ${ds.pagination.pageSize})\n      })\n      .catch(err => {\n        console.error('Failed to fetch ${ds.id}:', err)\n        Taro.showToast({ title: '加载失败', icon: 'error' })\n      })\n      .finally(() => {\n        set${capitalizedName.replace('Data', 'Loading')}(false)\n      })`
        } else {
          // Non-paginated: replace data
          fetchBody = `${dependencyCheck}${paramsDecl}set${capitalizedName.replace('Data', 'Loading')}(true)\n    Taro.request({ url: ${urlExpr}, method: '${ds.options.method}'${headerExpr} })\n      .then(res => {\n        const list = extractList(res.data)\n        if (list.length) set${capitalizedName}(list)\n      })\n      .catch(err => {\n        console.error('Failed to fetch ${ds.id}:', err)\n        Taro.showToast({ title: '加载失败', icon: 'error' })\n      })\n      .finally(() => {\n        set${capitalizedName.replace('Data', 'Loading')}(false)\n      })`
        }
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

      // Add effect to refetch when page changes (for pagination)
      if (ds.pagination && !isObjectType) {
        const pageVar = `${sanitizeVarName(ds.id)}Page`
        effects.push({
          trigger: 'mount',
          body: fetchBody,
          dependencies: [pageVar],
        })
      }

      // Generate loadMore handler for paginated data sources
      if (ds.pagination && !isObjectType) {
        const pageVar = `${sanitizeVarName(ds.id)}Page`
        const hasMoreVar = `${sanitizeVarName(ds.id)}HasMore`
        const loadingVar = `${sanitizeVarName(ds.id)}Loading`

        const loadMoreBody = `if (!${hasMoreVar} || ${loadingVar}) return\n    set${pageVar.charAt(0).toUpperCase() + pageVar.slice(1)}(prev => prev + 1)`

        handlers.push({
          name: `load${capitalizedName.replace('Data', '')}More`,
          body: loadMoreBody,
        })
      }
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

    // Add error state variable if validation rules exist
    if (fs.rules && fs.rules.length > 0) {
      stateVars.push({
        name: `${fs.id}Error`,
        type: 'string',
        defaultValue: '',
      })
    }
  }

  // Generate validation handlers for form states with rules
  for (const fs of pageFormStates) {
    if (fs.rules && fs.rules.length > 0) {
      const capitalizedName = fs.id.charAt(0).toUpperCase() + fs.id.slice(1)
      let validationBody = ''

      for (const rule of fs.rules) {
        const errorMsg = rule.message || '验证失败'

        switch (rule.type) {
          case 'required':
            if (fs.type === 'string') {
              validationBody += `if (!${fs.id} || ${fs.id}.trim() === '') {\n      set${capitalizedName}Error('${errorMsg}')\n      return false\n    }\n    `
            } else {
              validationBody += `if (${fs.id} === undefined || ${fs.id} === null) {\n      set${capitalizedName}Error('${errorMsg}')\n      return false\n    }\n    `
            }
            break

          case 'minLength':
            if (fs.type === 'string' && rule.value !== undefined) {
              validationBody += `if (${fs.id}.length < ${rule.value}) {\n      set${capitalizedName}Error('${errorMsg}')\n      return false\n    }\n    `
            }
            break

          case 'maxLength':
            if (fs.type === 'string' && rule.value !== undefined) {
              validationBody += `if (${fs.id}.length > ${rule.value}) {\n      set${capitalizedName}Error('${errorMsg}')\n      return false\n    }\n    `
            }
            break

          case 'min':
            if (fs.type === 'number' && rule.value !== undefined) {
              validationBody += `if (${fs.id} < ${rule.value}) {\n      set${capitalizedName}Error('${errorMsg}')\n      return false\n    }\n    `
            }
            break

          case 'max':
            if (fs.type === 'number' && rule.value !== undefined) {
              validationBody += `if (${fs.id} > ${rule.value}) {\n      set${capitalizedName}Error('${errorMsg}')\n      return false\n    }\n    `
            }
            break

          case 'pattern':
            if (fs.type === 'string' && rule.value !== undefined) {
              validationBody += `if (!/${rule.value}/.test(${fs.id})) {\n      set${capitalizedName}Error('${errorMsg}')\n      return false\n    }\n    `
            }
            break
        }
      }

      validationBody += `set${capitalizedName}Error('')\n    return true`

      handlers.push({
        name: `validate${capitalizedName}`,
        body: validationBody,
      })
    }
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
        case 'submitForm': {
          // New data source approach
          if (action.dataSourceId && action.fieldMapping) {
            const dataSource = pageDataSources.find(ds => ds.id === action.dataSourceId)
            if (!dataSource) {
              console.warn(`Data source ${action.dataSourceId} not found`)
              return ''
            }

            // Build data object from field mapping
            const dataFields: string[] = []
            if (dataSource.requestParams) {
              for (const param of dataSource.requestParams) {
                const mappedInputId = action.fieldMapping[param.name]
                if (mappedInputId) {
                  // Resolve input component ID to state variable name
                  const stateName = submitFormInputMap.get(mappedInputId) || mappedInputId
                  dataFields.push(`      ${param.name}: ${stateName}`)
                } else if (param.defaultValue !== undefined) {
                  // Use default value
                  const defaultVal = typeof param.defaultValue === 'string'
                    ? `'${param.defaultValue}'`
                    : param.defaultValue
                  dataFields.push(`      ${param.name}: ${defaultVal}`)
                }
              }
            }

            const dataObj = dataFields.join(',\n')
            return `Taro.request({
      url: '${dataSource.options.url}',
      method: '${dataSource.options.method}',
      data: {
${dataObj}
      }
    })
      .then(() => {
        Taro.showToast({ title: '${action.successMessage || '提交成功'}', icon: 'success' })
      })
      .catch((err) => {
        console.error('Submit failed:', err)
        Taro.showToast({ title: '${action.errorMessage || '提交失败'}', icon: 'error' })
      })`
          }

          // Legacy approach (backward compatibility)
          if (action.url && action.fields) {
            const dataObj = action.fields.map(f => `      ${f}`).join(',\n')
            return `e.preventDefault()
    Taro.request({
      url: '${action.url}',
      method: '${action.method || 'POST'}',
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
          }

          return ''
        }
        default:
          return ''
      }
    }).filter(Boolean)
    return statements.join('\n    ')
  }

  // Check if handler needs event parameter (e.g., onChange with e.detail.value)
  function needsEventParam(actions: Action[]): boolean {
    return actions.some(action =>
      (action.type === 'setState' && action.value.includes('e.detail'))
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

  // Pre-pass: collect all submitForm field mappings from Button actions
  // Maps inputComponentId -> state variable name
  const submitFormInputMap = new Map<string, string>()

  function collectSubmitFormMappings(node: ComponentNode) {
    if (node.events) {
      for (const actions of Object.values(node.events)) {
        for (const action of actions) {
          if (action.type === 'submitForm' && action.dataSourceId && action.fieldMapping) {
            for (const [, inputId] of Object.entries(action.fieldMapping)) {
              if (!submitFormInputMap.has(inputId)) {
                // Check if the input already has a state binding via onChange -> setState
                const inputNode = findNodeById(pageDef.componentTree, inputId)
                if (inputNode) {
                  const existingBinding = inputNode.events?.onChange?.find(
                    (a: Action) => a.type === 'setState'
                  )
                  if (existingBinding && existingBinding.type === 'setState') {
                    submitFormInputMap.set(inputId, existingBinding.target)
                  } else {
                    // Auto-create state variable name
                    const stateName = `input_${inputId.replace(/[^a-zA-Z0-9]/g, '_')}`
                    submitFormInputMap.set(inputId, stateName)
                  }
                }
              }
            }
          }
        }
      }
    }
    for (const child of node.children ?? []) {
      collectSubmitFormMappings(child)
    }
  }

  collectSubmitFormMappings(pageDef.componentTree)

  // Create state variables for auto-bound inputs (those without existing bindings)
  for (const [inputId, stateName] of submitFormInputMap) {
    const inputNode = findNodeById(pageDef.componentTree, inputId)
    if (!inputNode) continue
    const existingBinding = inputNode.events?.onChange?.find(
      (a: Action) => a.type === 'setState'
    )
    // Only create state var if the input doesn't already have a binding
    if (!existingBinding && !stateVars.find(sv => sv.name === stateName)) {
      stateVars.push({
        name: stateName,
        type: 'string',
        defaultValue: ''
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

    // Auto-bind Input/Textarea if referenced in a submitForm action (Button-based approach)
    if (node.component === 'Input' || node.component === 'Textarea') {
      const mappedStateName = submitFormInputMap.get(node.id)

      if (mappedStateName && !node.events?.onChange) {
        // This input is mapped in a Button's submitForm action and has no explicit binding
        // Auto-bind value
        if (!node.props.value || node.props.value === '') {
          irProps['value'] = { type: 'literal', value: `{{${mappedStateName}}}` }
        }

        // Auto-generate onChange handler
        handlerCounter++
        const handlerName = `handleOnChange${handlerCounter}`
        const capitalizedName = mappedStateName.charAt(0).toUpperCase() + mappedStateName.slice(1)
        handlers.push({
          name: handlerName,
          params: 'e',
          body: `set${capitalizedName}(e.detail.value)`,
        })
        irProps['onChange'] = { type: 'identifier', name: handlerName }
      } else if (!mappedStateName && node.props.name) {
        // Fallback: old behavior with name property
        let fieldName = String(node.props.name).trim()
        if (fieldName.startsWith('{{') && fieldName.endsWith('}}')) {
          fieldName = fieldName.slice(2, -2).trim()
        }
        if (fieldName.includes('.')) {
          const parts = fieldName.split('.')
          fieldName = parts[parts.length - 1]
        }
        fieldName = fieldName.replace(/^\$/, '').replace(/[^\w]/g, '_')

        if (fieldName) {
          const existingState = pageFormStates.find(fs => fs.id === fieldName)
          if (!existingState && !stateVars.find(sv => sv.name === fieldName)) {
            stateVars.push({ name: fieldName, type: 'string', defaultValue: '' })
          }
          if (!node.props.value || node.props.value === '') {
            irProps['value'] = { type: 'literal', value: `{{${fieldName}}}` }
          }
          if (!node.events?.onChange) {
            handlerCounter++
            const handlerName = `handleOnChange${handlerCounter}`
            const capitalizedName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
            handlers.push({ name: handlerName, params: 'e', body: `set${capitalizedName}(e.detail.value)` })
            irProps['onChange'] = { type: 'identifier', name: handlerName }
          }
        }
      }
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

  // Handle onLoad workflow (Phase 1 Feature 2)
  let onLoadWorkflow: IRPage['onLoadWorkflow'] = undefined
  if (pageDef.onLoadWorkflow?.workflowId) {
    const workflow = schema.workflows?.find(w => w.id === pageDef.onLoadWorkflow!.workflowId)
    if (workflow) {
      // Convert workflow name to camelCase handler name
      const handlerName = toCamelCase(workflow.name)
      // Extract output variables from workflow inline definition
      const outputVars: string[] = []
      if (workflow.inline && typeof workflow.inline === 'object') {
        const wfSchema = workflow.inline as any
        if (wfSchema.nodes) {
          for (const node of wfSchema.nodes) {
            if (node.outputVar) {
              outputVars.push(node.outputVar)
            }
          }
        }
      }
      onLoadWorkflow = {
        workflowHandlerName: handlerName,
        outputVars,
      }
    }
  }

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
    onLoadWorkflow,
  }
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
