import type { ParsedPart } from './types'

const EXPRESSION_REGEX = /\{\{([^}]+)\}\}/g

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
    const path = expr.split('.').map((p) => p.trim())

    // Validate: allow up to 4-part paths (e.g. $item.detail.info.name)
    if (path.length > 4) {
      // Invalid expression - treat as static
      parts.push({
        type: 'static',
        value: match[0],
      })
    } else {
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
