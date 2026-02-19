// ============================================================
// FSP Protocol Types — ForgeStudio Protocol v1.0
// ============================================================

/** Top-level page schema */
export interface FSPSchema {
  version: string
  meta: FSPMeta
  componentTree: ComponentNode  // Deprecated: use pages instead (kept for backward compatibility)
  /** @deprecated Use page-level dataSources instead (M4). Global dataSources will be auto-migrated to first page. */
  dataSources?: DataSourceDef[]
  /** @deprecated Use page-level formStates instead (M4). Global formStates will be auto-migrated to first page. */
  formStates?: FormStateDef[]
  /** Multi-page support (M3) */
  pages?: PageDef[]
  /** Global data sources shared across all pages (Area 2) */
  globalDataSources?: DataSourceDef[]
}

export interface FSPMeta {
  name: string
  description?: string
}

/** Page definition for multi-page apps (M3) */
export interface PageDef {
  id: string
  name: string  // e.g. 'index', 'detail', 'profile'
  title: string  // Display name
  path: string  // Route path, e.g. '/pages/index/index'
  componentTree: ComponentNode
  /** Page-level data sources (M4) */
  dataSources?: DataSourceDef[]
  /** Page-level form states (M4) */
  formStates?: FormStateDef[]
  /** Page parameters that can be passed via navigation (M4) */
  params?: PageParamDef[]
  /** References to global data sources (Area 2) */
  globalDataSourceRefs?: string[]
}

/** Page parameter definition (M4) */
export interface PageParamDef {
  name: string        // Parameter name, e.g. "id"
  type: 'string' | 'number'
  required: boolean
  description?: string  // For UI hints
}

/** Form state definition for Input bindings (M1.4) */
export interface FormStateDef {
  id: string
  type: 'string' | 'number' | 'boolean'
  defaultValue?: string | number | boolean
  /** Validation rules (M5) */
  rules?: ValidationRule[]
}

/** Validation rule for form fields (M5) */
export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max'
  value?: string | number  // For minLength, maxLength, pattern, min, max
  message?: string  // Custom error message
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

/** Field schema extracted from API response */
export interface FieldSchema {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
}

/** Data source definition (M1.3, M5: real API-driven) */
export interface DataSourceDef {
  id: string
  type: 'api'
  /** Purpose: query (fetch data) vs mutation (create/update/delete) */
  purpose: 'query' | 'mutation'
  /** Data type: 'array' for list APIs, 'object' for detail APIs (default: 'array') */
  dataType?: 'array' | 'object'
  /** Display label, e.g. "Get Product List" */
  label?: string
  options: {
    url: string
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    headers?: Record<string, string>
    /** Request body template for mutations (JSON string) */
    body?: string
  }
  /** Auto-fetch on page load (default true for query, false for mutation) */
  autoFetch: boolean
  /** @deprecated Use sampleData instead. Kept for backward compatibility */
  mockData?: unknown
  /** Sample data cached from real API (for editor preview only, max 3 items) */
  sampleData?: unknown[]
  /** Fields extracted from API response */
  responseFields?: FieldSchema[]
  /** Dependencies: data sources that must be fetched before this one (M2) */
  dependsOn?: string[]
}

/** Action types for event handlers (M1.4) */
export type Action =
  | NavigateAction
  | ShowToastAction
  | SetStateAction
  | SubmitFormAction

export interface NavigateAction {
  type: 'navigate'
  url: string  // e.g. '/pages/detail/index'
  params?: Record<string, string>  // URL parameters, e.g. {id: '{{$item.id}}'}
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

export interface SubmitFormAction {
  type: 'submitForm'
  url: string  // API endpoint
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  fields: string[]  // state variable names to collect
  successMessage?: string
  errorMessage?: string
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
