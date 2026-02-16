// ============================================================
// FSP Protocol Types — ForgeStudio Protocol v1.0
// ============================================================

/** Top-level page schema */
export interface FSPSchema {
  version: string
  meta: FSPMeta
  componentTree: ComponentNode
  dataSources?: DataSourceDef[]
  formStates?: FormStateDef[]
}

export interface FSPMeta {
  name: string
  description?: string
}

/** Form state definition for Input bindings (M1.4) */
export interface FormStateDef {
  id: string
  type: 'string' | 'number' | 'boolean'
  defaultValue?: string | number | boolean
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
  /** Event handlers (M1.4) */
  events?: {
    [eventName: string]: Action[]  // e.g. onClick: [action1, action2]
  }
  /** Conditional rendering (M1.5) */
  condition?: {
    type: 'expression'  // Future: 'compare', 'and', 'or'
    expression: string  // e.g. '{{inputValue}}' or '{{count}} > 0'
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

/** Action types for event handlers (M1.4) */
export type Action =
  | NavigateAction
  | ShowToastAction
  | SetStateAction

export interface NavigateAction {
  type: 'navigate'
  url: string  // e.g. '/pages/detail/index'
}

export interface ShowToastAction {
  type: 'showToast'
  title: string
  icon?: 'success' | 'error' | 'loading' | 'none'
}

export interface SetStateAction {
  type: 'setState'
  target: string  // state variable name
  value: string   // expression or literal
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
  /** Supported events (M1.4) */
  supportedEvents?: string[]  // e.g. ['onClick', 'onChange']
}

export type PropType = 'string' | 'number' | 'boolean' | 'enum' | 'color' | 'image'

export interface PropDefinition {
  name: string
  title: string
  type: PropType
  default?: unknown
  options?: { label: string; value: unknown }[]
}
