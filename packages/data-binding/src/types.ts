export interface ParsedPart {
  type: 'static' | 'expression' | 'complex'
  value?: string
  path?: string[]
  expression?: string  // For complex expressions like "a > b ? x : y"
}

export interface ExpressionContext {
  $item?: Record<string, any>
  $ds?: Record<string, any>
  $state?: Record<string, any>
  [key: string]: any
}
