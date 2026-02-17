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
    componentTree: defaultPage.componentTree, // For backward compatibility
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

export function updatePage(schema: FSPSchema, pageId: string, updates: Partial<PageDef>): boolean {
  const page = findPageById(schema, pageId)
  if (!page) return false
  Object.assign(page, updates)
  return true
}
