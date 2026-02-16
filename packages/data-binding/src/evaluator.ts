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

  // If only one expression part and no static parts, return the raw value
  if (parts.length === 1 && parts[0].type === 'expression') {
    return evaluatePath(parts[0].path!, context)
  }

  // Otherwise, concatenate all parts as strings
  return parts
    .map((part) => {
      if (part.type === 'static') {
        return part.value
      }
      const value = evaluatePath(part.path!, context)
      return value != null ? String(value) : ''
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
