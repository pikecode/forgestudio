import type { ComponentNode, FSPSchema } from './types'

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
  return {
    version: '1.0.0',
    meta: { name: '未命名页面' },
    componentTree: {
      id: 'root',
      component: 'Page',
      props: { title: '页面' },
      styles: {},
      children: [],
    },
  }
}
