import type { ExpressionContext } from './types'
import { parseExpression } from './parser'

export function evaluate(
  template: string,
  context: ExpressionContext,
): string | number | boolean | null {
  if (typeof template !== 'string') {
    return template as string | number | boolean | null
  }

  const parts = parseExpression(template)

  // If only one part, return the raw value
  if (parts.length === 1) {
    if (parts[0].type === 'expression') {
      return evaluatePath(parts[0].path!, context) as string | number | boolean | null
    }
    if (parts[0].type === 'complex') {
      return evaluateComplexExpression(parts[0].expression!, context) as string | number | boolean | null
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
): unknown {
  let result: unknown = context

  for (const part of path) {
    if (result == null || typeof result !== 'object') {
      return null
    }
    result = (result as Record<string, unknown>)[part]
  }

  return result
}

// Tokenizer for safe expression evaluation (no Function constructor)
const TOKEN_REGEX = /(\$\w+(?:\.\w+)*)|(\d+(?:\.\d+)?)|('[^']*'|"[^"]*")|(===|!==|==|!=|>=|<=|&&|\|\|)|([><!?:+\-*/%()])|(\w+)/g

type TokenType = 'var' | 'num' | 'str' | 'op' | 'bool' | 'null'
interface Token { type: TokenType; value: string }

function tokenize(expr: string): Token[] {
  const tokens: Token[] = []
  let match: RegExpExecArray | null
  TOKEN_REGEX.lastIndex = 0
  while ((match = TOKEN_REGEX.exec(expr)) !== null) {
    if (match[1]) tokens.push({ type: 'var', value: match[1] })
    else if (match[2]) tokens.push({ type: 'num', value: match[2] })
    else if (match[3]) tokens.push({ type: 'str', value: match[3].slice(1, -1) })
    else if (match[4]) tokens.push({ type: 'op', value: match[4] })
    else if (match[5]) tokens.push({ type: 'op', value: match[5] })
    else if (match[6]) {
      const w = match[6]
      if (w === 'true' || w === 'false') tokens.push({ type: 'bool', value: w })
      else if (w === 'null' || w === 'undefined') tokens.push({ type: 'null', value: w })
      else tokens.push({ type: 'var', value: w })
    }
  }
  return tokens
}

// Recursive descent parser for safe expression evaluation
function evaluateComplexExpression(
  expr: string,
  context: ExpressionContext,
): unknown {
  try {
    const tokens = tokenize(expr)
    let pos = 0

    function peek(): Token | undefined { return tokens[pos] }
    function next(): Token { return tokens[pos++] }

    function resolveVar(name: string): unknown {
      const parts = name.split('.')
      return evaluatePath(parts, context)
    }

    // Primary: literals, variables, parenthesized expressions, unary operators
    function parsePrimary(): unknown {
      const t = peek()
      if (!t) return null

      if (t.type === 'op' && t.value === '(') {
        next()
        const val = parseTernary()
        if (peek()?.value === ')') next()
        return val
      }
      if (t.type === 'op' && t.value === '!') {
        next()
        return !parsePrimary()
      }
      if (t.type === 'op' && t.value === '-') {
        next()
        return -(parsePrimary() as number)
      }
      if (t.type === 'num') { next(); return Number(t.value) }
      if (t.type === 'str') { next(); return t.value }
      if (t.type === 'bool') { next(); return t.value === 'true' }
      if (t.type === 'null') { next(); return null }
      if (t.type === 'var') { next(); return resolveVar(t.value) }
      next()
      return null
    }

    // Multiplicative: *, /, %
    function parseMul(): unknown {
      let left = parsePrimary()
      while (peek()?.value === '*' || peek()?.value === '/' || peek()?.value === '%') {
        const op = next().value
        const right = parsePrimary() as number
        if (op === '*') left = (left as number) * right
        else if (op === '/') left = right !== 0 ? (left as number) / right : 0
        else left = (left as number) % right
      }
      return left
    }

    // Additive: +, -
    function parseAdd(): unknown {
      let left = parseMul()
      while (peek()?.value === '+' || peek()?.value === '-') {
        const op = next().value
        const right = parseMul()
        if (op === '+') {
          if (typeof left === 'string' || typeof right === 'string') left = String(left ?? '') + String(right ?? '')
          else left = (left as number) + (right as number)
        } else left = (left as number) - (right as number)
      }
      return left
    }

    // Comparison: >, <, >=, <=
    function parseComparison(): unknown {
      let left = parseAdd()
      while (peek()?.value === '>' || peek()?.value === '<' || peek()?.value === '>=' || peek()?.value === '<=') {
        const op = next().value
        const right = parseAdd() as number
        if (op === '>') left = (left as number) > right
        else if (op === '<') left = (left as number) < right
        else if (op === '>=') left = (left as number) >= right
        else left = (left as number) <= right
      }
      return left
    }

    // Equality: ===, !==, ==, !=
    function parseEquality(): unknown {
      let left = parseComparison()
      while (peek()?.value === '===' || peek()?.value === '!==' || peek()?.value === '==' || peek()?.value === '!=') {
        const op = next().value
        const right = parseComparison()
        if (op === '===' || op === '==') left = left === right
        else left = left !== right
      }
      return left
    }

    // Logical AND: &&
    function parseAnd(): unknown {
      let left = parseEquality()
      while (peek()?.value === '&&') {
        next()
        const right = parseEquality()
        left = left && right
      }
      return left
    }

    // Logical OR: ||
    function parseOr(): unknown {
      let left = parseAnd()
      while (peek()?.value === '||') {
        next()
        const right = parseAnd()
        left = left || right
      }
      return left
    }

    // Ternary: condition ? trueExpr : falseExpr
    function parseTernary(): unknown {
      const cond = parseOr()
      if (peek()?.value === '?') {
        next()
        const trueVal = parseTernary()
        if (peek()?.value === ':') next()
        const falseVal = parseTernary()
        return cond ? trueVal : falseVal
      }
      return cond
    }

    return parseTernary()
  } catch (e) {
    console.warn('Failed to evaluate complex expression:', expr, e)
    return null
  }
}
