// ============================================================
// FSP Protocol Types — ForgeStudio Protocol v1.0
// ============================================================

/** Top-level page schema */
export interface FSPSchema {
  version: string
  meta: FSPMeta
  componentTree: ComponentNode
  dataSources?: DataSourceDef[]
}

export interface FSPMeta {
  name: string
  description?: string
}

/** A single node in the component tree */
export interface ComponentNode {
  id: string
  component: string
  props: Record<string, unknown>
  styles: Record<string, unknown>
  children?: ComponentNode[]
  /** Loop binding — only used by List-like components (M1.3) */
  loop?: {
    dataSourceId: string
    itemName?: string
  }
}

/** Data source definition (M1.3, declared here for forward compat) */
export interface DataSourceDef {
  id: string
  type: 'api'
  options: {
    url: string
    method: 'GET' | 'POST'
    headers?: Record<string, string>
  }
  autoFetch: boolean
  mockData?: unknown
}

// ============================================================
// Component Meta — drives the editor UI
// ============================================================

export interface ComponentMeta {
  name: string
  title: string
  icon: string
  category: 'basic' | 'layout' | 'data'
  defaultProps: Record<string, unknown>
  defaultStyles: Record<string, unknown>
  propsSchema: PropDefinition[]
  allowChildren: boolean
  allowedChildComponents?: string[]
}

export type PropType = 'string' | 'number' | 'boolean' | 'enum' | 'color' | 'image'

export interface PropDefinition {
  name: string
  title: string
  type: PropType
  default?: unknown
  options?: { label: string; value: unknown }[]
}
