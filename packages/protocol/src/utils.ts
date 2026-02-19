import type { ComponentNode, FSPSchema, PageDef } from './types'

// ---- ID generation ----

const counters = new Map<string, number>()

export function resetIdCounters(): void {
  counters.clear()
}

export function generateNodeId(componentName: string): string {
  const key = componentName.toLowerCase()
  const next = (counters.get(key) ?? 0) + 1
  counters.set(key, next)
  return `${key}_${next}`
}

// ---- Node CRUD ----

export function createNode(
  componentName: string,
  props: Record<string, unknown> = {},
  styles: Record<string, unknown> = {},
): ComponentNode {
  return {
    id: generateNodeId(componentName),
    component: componentName,
    props,
    styles,
    children: [],
  }
}

export function findNodeById(
  root: ComponentNode,
  id: string,
): ComponentNode | null {
  if (root.id === id) return root
  for (const child of root.children ?? []) {
    const found = findNodeById(child, id)
    if (found) return found
  }
  return null
}

export function findParentNode(
  root: ComponentNode,
  childId: string,
): ComponentNode | null {
  for (const child of root.children ?? []) {
    if (child.id === childId) return root
    const found = findParentNode(child, childId)
    if (found) return found
  }
  return null
}

export function removeNode(root: ComponentNode, nodeId: string): boolean {
  const parent = findParentNode(root, nodeId)
  if (!parent || !parent.children) return false
  const idx = parent.children.findIndex((c) => c.id === nodeId)
  if (idx === -1) return false
  parent.children.splice(idx, 1)
  return true
}

export function moveNode(
  root: ComponentNode,
  nodeId: string,
  targetParentId: string,
  index: number,
): boolean {
  const node = findNodeById(root, nodeId)
  if (!node) return false
  if (!removeNode(root, nodeId)) return false
  const target = findNodeById(root, targetParentId)
  if (!target) return false
  if (!target.children) target.children = []
  target.children.splice(index, 0, node)
  return true
}

// ---- Schema helpers ----

export function createEmptySchema(): FSPSchema {
  const defaultPage: PageDef = {
    id: 'page_index',
    name: 'index',
    title: '首页',
    path: '/pages/index/index',
    componentTree: {
      id: 'root_page_index',
      component: 'Page',
      props: { title: '页面' },
      styles: {},
      children: [],
    },
  }

  return {
    version: '1.0.0',
    meta: { name: '未命名应用' },
    componentTree: structuredClone(defaultPage.componentTree), // Independent copy for backward compatibility
    pages: [defaultPage],
  }
}

// ---- Multi-page helpers (M3) ----

export function createEmptyPage(name: string, title: string): PageDef {
  const pageId = `page_${name}_${Date.now()}`
  return {
    id: pageId,
    name,
    title,
    path: `/pages/${name}/index`,
    componentTree: {
      id: `root_${pageId}`,
      component: 'Page',
      props: { title },
      styles: {},
      children: [],
    },
  }
}

export function findPageById(schema: FSPSchema, pageId: string): PageDef | null {
  return schema.pages?.find(p => p.id === pageId) ?? null
}

export function addPage(schema: FSPSchema, page: PageDef): void {
  if (!schema.pages) schema.pages = []
  schema.pages.push(page)
}

export function removePage(schema: FSPSchema, pageId: string): boolean {
  if (!schema.pages) return false
  const idx = schema.pages.findIndex(p => p.id === pageId)
  if (idx === -1) return false
  schema.pages.splice(idx, 1)
  return true
}

export function updatePage(schema: FSPSchema, pageId: string, updates: Partial<Pick<PageDef, 'name' | 'title' | 'path'>>): boolean {
  const page = findPageById(schema, pageId)
  if (!page) return false
  Object.assign(page, updates)
  return true
}

// ---- Page-level DataSource helpers (M4) ----

import type { DataSourceDef, FormStateDef } from './types'

export function addDataSourceToPage(page: PageDef, ds: DataSourceDef): void {
  if (!page.dataSources) page.dataSources = []
  page.dataSources.push(ds)
}

export function findDataSourceInPage(page: PageDef, dsId: string): DataSourceDef | null {
  return page.dataSources?.find(ds => ds.id === dsId) ?? null
}

export function updateDataSourceInPage(page: PageDef, dsId: string, updates: Partial<DataSourceDef>): boolean {
  const ds = findDataSourceInPage(page, dsId)
  if (!ds) return false
  Object.assign(ds, updates)
  return true
}

export function removeDataSourceFromPage(page: PageDef, dsId: string): boolean {
  if (!page.dataSources) return false
  const idx = page.dataSources.findIndex(ds => ds.id === dsId)
  if (idx === -1) return false
  page.dataSources.splice(idx, 1)
  return true
}

// ---- Page-level FormState helpers (M4) ----

export function addFormStateToPage(page: PageDef, fs: FormStateDef): void {
  if (!page.formStates) page.formStates = []
  page.formStates.push(fs)
}

export function findFormStateInPage(page: PageDef, fsId: string): FormStateDef | null {
  return page.formStates?.find(fs => fs.id === fsId) ?? null
}

export function updateFormStateInPage(page: PageDef, fsId: string, updates: Partial<FormStateDef>): boolean {
  const fs = findFormStateInPage(page, fsId)
  if (!fs) return false
  Object.assign(fs, updates)
  return true
}

export function removeFormStateFromPage(page: PageDef, fsId: string): boolean {
  if (!page.formStates) return false
  const idx = page.formStates.findIndex(fs => fs.id === fsId)
  if (idx === -1) return false
  page.formStates.splice(idx, 1)
  return true
}

// ---- Global DataSource helpers (Area 2) ----

export function addGlobalDataSource(schema: FSPSchema, ds: DataSourceDef): void {
  if (!schema.globalDataSources) schema.globalDataSources = []
  schema.globalDataSources.push(ds)
}

export function findGlobalDataSource(schema: FSPSchema, dsId: string): DataSourceDef | null {
  return schema.globalDataSources?.find(ds => ds.id === dsId) ?? null
}

export function updateGlobalDataSource(schema: FSPSchema, dsId: string, updates: Partial<DataSourceDef>): boolean {
  const ds = findGlobalDataSource(schema, dsId)
  if (!ds) return false
  Object.assign(ds, updates)
  return true
}

export function removeGlobalDataSource(schema: FSPSchema, dsId: string): boolean {
  if (!schema.globalDataSources) return false
  const idx = schema.globalDataSources.findIndex(ds => ds.id === dsId)
  if (idx === -1) return false
  schema.globalDataSources.splice(idx, 1)
  return true
}

/**
 * Get effective data sources for a page by merging:
 * 1. Global data sources referenced by the page
 * 2. Page-level data sources
 */
export function getEffectiveDataSources(schema: FSPSchema, pageId: string): DataSourceDef[] {
  const page = findPageById(schema, pageId)
  if (!page) return []

  const globalRefs = page.globalDataSourceRefs || []
  const globalDataSources = schema.globalDataSources || []
  const pageDataSources = page.dataSources || []

  // Get referenced global data sources
  const referencedGlobal = globalDataSources.filter(ds => globalRefs.includes(ds.id))

  // Merge: global first, then page-level
  return [...referencedGlobal, ...pageDataSources]
}

/**
 * Add a global data source reference to a page
 */
export function addGlobalDataSourceRef(page: PageDef, dsId: string): void {
  if (!page.globalDataSourceRefs) page.globalDataSourceRefs = []
  if (!page.globalDataSourceRefs.includes(dsId)) {
    page.globalDataSourceRefs.push(dsId)
  }
}

/**
 * Remove a global data source reference from a page
 */
export function removeGlobalDataSourceRef(page: PageDef, dsId: string): boolean {
  if (!page.globalDataSourceRefs) return false
  const idx = page.globalDataSourceRefs.indexOf(dsId)
  if (idx === -1) return false
  page.globalDataSourceRefs.splice(idx, 1)
  return true
}

/**
 * Toggle a global data source reference for a page (add if not present, remove if present)
 */
export function togglePageGlobalDataSourceRef(page: PageDef, dsId: string): void {
  if (!page.globalDataSourceRefs) page.globalDataSourceRefs = []
  const idx = page.globalDataSourceRefs.indexOf(dsId)
  if (idx === -1) {
    // Not present, add it
    page.globalDataSourceRefs.push(dsId)
  } else {
    // Present, remove it
    page.globalDataSourceRefs.splice(idx, 1)
  }
}
