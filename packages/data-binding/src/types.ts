export interface ParsedPart {
  type: 'static' | 'expression'
  value?: string
  path?: string[]
}

export interface ExpressionContext {
  $item?: Record<string, any>
  $ds?: Record<string, any>
  [key: string]: any
}
