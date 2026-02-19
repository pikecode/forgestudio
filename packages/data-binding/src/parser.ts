import type { ParsedPart } from './types'

const EXPRESSION_REGEX = /\{\{([^}]+)\}\}/g

// Check if expression contains operators (complex expression)
function isComplexExpression(expr: string): boolean {
  // Check for comparison, logical, ternary, and arithmetic operators
  // Exclude dots and dollar signs which are part of path expressions
  return /[><=!&|?:+\-*/%]/.test(expr) && !/^[\w$.\[\]]+$/.test(expr)
}

export function parseExpression(template: string): ParsedPart[] {
  const parts: ParsedPart[] = []
  let lastIndex = 0

  const matches = template.matchAll(EXPRESSION_REGEX)

  for (const match of matches) {
    const matchIndex = match.index!

    // Add static part before expression
    if (matchIndex > lastIndex) {
      parts.push({
        type: 'static',
        value: template.slice(lastIndex, matchIndex),
      })
    }

    // Parse expression
    const expr = match[1].trim()

    // Check if it's a complex expression (contains operators)
    if (isComplexExpression(expr)) {
      parts.push({
        type: 'complex',
        expression: expr,
      })
    } else {
      // Simple path expression — no depth limit
      const path = expr.split('.').map((p) => p.trim())

      parts.push({
        type: 'expression',
        path,
      })
    }

    lastIndex = matchIndex + match[0].length
  }

  // Add remaining static part
  if (lastIndex < template.length) {
    parts.push({
      type: 'static',
      value: template.slice(lastIndex),
    })
  }

  return parts
}

export function hasExpression(value: unknown): boolean {
  return typeof value === 'string' && value.includes('{{')
}
