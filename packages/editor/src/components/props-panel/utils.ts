import type { ComponentNode, DataSourceDef, PropDefinition } from '@forgestudio/protocol'
import { findParentNode } from '@forgestudio/protocol'

/** Find the ancestor List node that has a loop binding */
export function findLoopAncestor(tree: ComponentNode, nodeId: string): ComponentNode | null {
  let current = findParentNode(tree, nodeId)
  while (current) {
    if (current.loop) return current
    current = findParentNode(tree, current.id)
  }
  return null
}

/** Extract field names from data source (from responseFields or fallback to sampleData) */
export function getDataSourceFields(dataSources: DataSourceDef[], dataSourceId: string): string[] {
  const ds = dataSources.find((d) => d.id === dataSourceId)
  if (!ds) return []

  if (ds.responseFields && ds.responseFields.length > 0) {
    return ds.responseFields.map(f => f.name)
  }

  if (ds.sampleData) {
    if (Array.isArray(ds.sampleData) && ds.sampleData.length > 0) {
      const firstItem = ds.sampleData[0]
      if (firstItem && typeof firstItem === 'object') {
        return Object.keys(firstItem)
      }
    } else if (typeof ds.sampleData === 'object' && !Array.isArray(ds.sampleData)) {
      return Object.keys(ds.sampleData)
    }
  }

  const mockData = (ds as any).mockData
  if (mockData) {
    const mockDataObj = mockData as { data?: any[] }
    const firstItem = mockDataObj?.data?.[0]
    if (firstItem && typeof firstItem === 'object') {
      return Object.keys(firstItem)
    }
  }

  return []
}
