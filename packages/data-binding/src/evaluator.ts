import type { ExpressionContext } from './types'
import { parseExpression } from './parser'

export function evaluate(
  template: string,
  context: ExpressionContext,
): string | number | boolean | null {
  if (typeof template !== 'string') {
    return template as any
  }

  const parts = parseExpression(template)

  // If only one part, return the raw value
  if (parts.length === 1) {
    if (parts[0].type === 'expression') {
      return evaluatePath(parts[0].path!, context)
    }
    if (parts[0].type === 'complex') {
      return evaluateComplexExpression(parts[0].expression!, context)
    }
  }

  // Otherwise, concatenate all parts as strings
  return parts
    .map((part) => {
      if (part.type === 'static') {
        return part.value
      }
      if (part.type === 'expression') {
        const value = evaluatePath(part.path!, context)
        return value != null ? String(value) : ''
      }
      if (part.type === 'complex') {
        const value = evaluateComplexExpression(part.expression!, context)
        return value != null ? String(value) : ''
      }
      return ''
    })
    .join('')
}

function evaluatePath(
  path: string[],
  context: ExpressionContext,
): any {
  let result: any = context

  for (const part of path) {
    if (result == null) {
      return null
    }
    result = result[part]
  }

  return result
}

/**
 * Evaluate complex expressions like:
 * - count > 0
 * - stock === 0
 * - a > b ? x : y
 * - isLogin && hasPermission
 */
function evaluateComplexExpression(
  expr: string,
  context: ExpressionContext,
): any {
  try {
    // Replace variable references with context lookups
    // Support: $item.field, $state.var, $ds.name.data
    const processedExpr = expr.replace(/\$(\w+)(?:\.(\w+(?:\.\w+)*))?/g, (match, prefix, path) => {
      // Build the full path including the $ prefix
      const fullPath = path ? `$${prefix}.${path}` : `$${prefix}`
      const value = evaluatePath(fullPath.split('.'), context)

      // Return JSON representation for safe evaluation
      if (typeof value === 'string') {
        return JSON.stringify(value)
      }
      if (value === null || value === undefined) {
        return 'null'
      }
      if (typeof value === 'boolean') {
        return value ? 'true' : 'false'
      }
      if (Array.isArray(value)) {
        return JSON.stringify(value)
      }
      return String(value)
    })

    // Use Function constructor for safe evaluation (better than eval)
    // This creates a new function scope and evaluates the expression
    const fn = new Function(`return ${processedExpr}`)
    return fn()
  } catch (e) {
    console.warn('Failed to evaluate complex expression:', expr, e)
    return null
  }
}
