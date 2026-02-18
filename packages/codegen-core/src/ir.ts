// Intermediate Representation types for code generation

export interface IRProject {
  pages: IRPage[]
  appName: string
}

export interface IRPage {
  id: string                 // page id from schema
  name: string               // page name (e.g., 'index', 'detail')
  title: string              // page title for display
  path: string               // route path (e.g., '/pages/index/index')
  imports: IRImport[]
  stateVars: IRStateVar[]    // empty in M1.2, for M1.3+
  effects: IREffect[]        // empty in M1.2, for M1.3+
  handlers: IRHandler[]      // empty in M1.2, for M1.3+
  renderTree: IRRenderNode
  styles: IRStyleSheet
}

export interface IRImport {
  source: string              // e.g. '@tarojs/components'
  specifiers: string[]        // e.g. ['View', 'Text', 'Image']
}

export interface IRRenderNode {
  tag: string                 // e.g. 'View', 'Text'
  props: Record<string, IRExpression>
  children: (IRRenderNode | IRTextContent)[]
  className?: string          // CSS class name (= node id)
  loop?: {                    // Loop rendering info (M1.3)
    dataVar: string           // e.g. 'productsData'
    itemVar: string           // e.g. 'item'
  }
  condition?: {               // Conditional rendering (M1.5)
    expression: string        // e.g. 'inputValue' or 'count > 0'
  }
}

export interface IRTextContent {
  type: 'text'
  value: string
}

export type IRExpression =
  | { type: 'literal'; value: string | number | boolean }
  | { type: 'identifier'; name: string }  // for M1.3+

export interface IRStyleSheet {
  rules: IRStyleRule[]
}

export interface IRStyleRule {
  selector: string            // e.g. '.text_1'
  properties: Record<string, string>  // e.g. { 'font-size': '32px' }
}

// Forward compatibility stubs for M1.3+
export interface IRStateVar {
  name: string
  type: string
  defaultValue: unknown
}

export interface IREffect {
  trigger: string
  body: string
}

export interface IRHandler {
  name: string
  params?: string  // e.g., 'e' for onChange handlers
  body: string
}
