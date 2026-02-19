import { describe, it, expect } from 'vitest'
import { evaluate } from '../evaluator'
import type { ExpressionContext } from '../types'

describe('evaluate', () => {
  describe('simple path expressions', () => {
    it('should resolve simple property access', () => {
      const context: ExpressionContext = { name: 'Alice', age: 30 }
      expect(evaluate('{{name}}', context)).toBe('Alice')
      expect(evaluate('{{age}}', context)).toBe(30)
    })

    it('should resolve nested property access', () => {
      const context: ExpressionContext = {
        user: { name: 'Bob', profile: { city: 'NYC' } }
      }
      expect(evaluate('{{user.name}}', context)).toBe('Bob')
      expect(evaluate('{{user.profile.city}}', context)).toBe('NYC')
    })

    it('should handle $item context', () => {
      const context: ExpressionContext = {
        $item: { id: 1, title: 'Product' }
      }
      expect(evaluate('{{$item.id}}', context)).toBe(1)
      expect(evaluate('{{$item.title}}', context)).toBe('Product')
    })

    it('should handle $index context', () => {
      const context: ExpressionContext = { $index: 5 }
      expect(evaluate('{{$index}}', context)).toBe(5)
    })

    it('should return null for undefined paths', () => {
      const context: ExpressionContext = { name: 'Alice' }
      expect(evaluate('{{missing}}', context)).toBeUndefined()
      expect(evaluate('{{user.name}}', context)).toBe(null)
    })

    it('should handle null and undefined values', () => {
      const context: ExpressionContext = { value: null, other: undefined }
      expect(evaluate('{{value}}', context)).toBe(null)
      expect(evaluate('{{other}}', context)).toBeUndefined()
    })
  })

  describe('string concatenation', () => {
    it('should concatenate static text with expressions', () => {
      const context: ExpressionContext = { name: 'Alice', age: 30 }
      expect(evaluate('Hello {{name}}!', context)).toBe('Hello Alice!')
      expect(evaluate('Name: {{name}}, Age: {{age}}', context)).toBe('Name: Alice, Age: 30')
    })

    it('should handle multiple expressions', () => {
      const context: ExpressionContext = { first: 'John', last: 'Doe' }
      expect(evaluate('{{first}} {{last}}', context)).toBe('John Doe')
    })

    it('should handle empty expressions as empty strings', () => {
      const context: ExpressionContext = { name: null }
      expect(evaluate('Hello {{name}}!', context)).toBe('Hello !')
    })
  })

  describe('arithmetic operators', () => {
    it('should handle addition', () => {
      const context: ExpressionContext = { a: 10, b: 5 }
      expect(evaluate('{{a + b}}', context)).toBe(15)
      expect(evaluate('{{a + 3}}', context)).toBe(13)
    })

    it('should handle subtraction', () => {
      const context: ExpressionContext = { a: 10, b: 5 }
      expect(evaluate('{{a - b}}', context)).toBe(5)
      expect(evaluate('{{a - 3}}', context)).toBe(7)
    })

    it('should handle multiplication', () => {
      const context: ExpressionContext = { a: 10, b: 5 }
      expect(evaluate('{{a * b}}', context)).toBe(50)
      expect(evaluate('{{a * 2}}', context)).toBe(20)
    })

    it('should handle division', () => {
      const context: ExpressionContext = { a: 10, b: 5 }
      expect(evaluate('{{a / b}}', context)).toBe(2)
      expect(evaluate('{{a / 2}}', context)).toBe(5)
    })

    it('should handle division by zero', () => {
      const context: ExpressionContext = { a: 10 }
      expect(evaluate('{{a / 0}}', context)).toBe(0)
    })

    it('should handle modulo', () => {
      const context: ExpressionContext = { a: 10, b: 3 }
      expect(evaluate('{{a % b}}', context)).toBe(1)
      expect(evaluate('{{a % 4}}', context)).toBe(2)
    })

    it('should handle operator precedence', () => {
      const context: ExpressionContext = { a: 2, b: 3, c: 4 }
      expect(evaluate('{{a + b * c}}', context)).toBe(14) // 2 + (3 * 4)
      expect(evaluate('{{a * b + c}}', context)).toBe(10) // (2 * 3) + 4
    })

    it('should handle parentheses', () => {
      const context: ExpressionContext = { a: 2, b: 3, c: 4 }
      expect(evaluate('{{(a + b) * c}}', context)).toBe(20) // (2 + 3) * 4
    })

    it('should handle unary minus', () => {
      const context: ExpressionContext = { a: 10 }
      expect(evaluate('{{-a}}', context)).toBe(-10)
      expect(evaluate('{{-5}}', context)).toBe(-5)
    })
  })

  describe('comparison operators', () => {
    it('should handle greater than', () => {
      const context: ExpressionContext = { a: 10, b: 5 }
      expect(evaluate('{{a > b}}', context)).toBe(true)
      expect(evaluate('{{b > a}}', context)).toBe(false)
      expect(evaluate('{{a > 10}}', context)).toBe(false)
    })

    it('should handle less than', () => {
      const context: ExpressionContext = { a: 10, b: 5 }
      expect(evaluate('{{a < b}}', context)).toBe(false)
      expect(evaluate('{{b < a}}', context)).toBe(true)
      expect(evaluate('{{a < 10}}', context)).toBe(false)
    })

    it('should handle greater than or equal', () => {
      const context: ExpressionContext = { a: 10, b: 5 }
      expect(evaluate('{{a >= b}}', context)).toBe(true)
      expect(evaluate('{{a >= 10}}', context)).toBe(true)
      expect(evaluate('{{b >= a}}', context)).toBe(false)
    })

    it('should handle less than or equal', () => {
      const context: ExpressionContext = { a: 10, b: 5 }
      expect(evaluate('{{a <= b}}', context)).toBe(false)
      expect(evaluate('{{a <= 10}}', context)).toBe(true)
      expect(evaluate('{{b <= a}}', context)).toBe(true)
    })
  })

  describe('equality operators', () => {
    it('should handle strict equality', () => {
      const context: ExpressionContext = { a: 10, b: 10, c: '10' }
      expect(evaluate('{{a === b}}', context)).toBe(true)
      expect(evaluate('{{a === c}}', context)).toBe(false)
      expect(evaluate('{{a === 10}}', context)).toBe(true)
    })

    it('should handle strict inequality', () => {
      const context: ExpressionContext = { a: 10, b: 10, c: '10' }
      expect(evaluate('{{a !== b}}', context)).toBe(false)
      expect(evaluate('{{a !== c}}', context)).toBe(true)
      expect(evaluate('{{a !== 5}}', context)).toBe(true)
    })

    it('should handle loose equality', () => {
      const context: ExpressionContext = { a: 10, b: 10 }
      expect(evaluate('{{a == b}}', context)).toBe(true)
      expect(evaluate('{{a == 10}}', context)).toBe(true)
    })

    it('should handle loose inequality', () => {
      const context: ExpressionContext = { a: 10, b: 5 }
      expect(evaluate('{{a != b}}', context)).toBe(true)
      expect(evaluate('{{a != 10}}', context)).toBe(false)
    })
  })

  describe('logical operators', () => {
    it('should handle logical AND', () => {
      const context: ExpressionContext = { a: true, b: false }
      expect(evaluate('{{a && a}}', context)).toBe(true)
      expect(evaluate('{{a && b}}', context)).toBe(false)
      expect(evaluate('{{b && b}}', context)).toBe(false)
    })

    it('should handle logical OR', () => {
      const context: ExpressionContext = { a: true, b: false }
      expect(evaluate('{{a || b}}', context)).toBe(true)
      expect(evaluate('{{b || a}}', context)).toBe(true)
      expect(evaluate('{{b || b}}', context)).toBe(false)
    })

    it('should handle logical NOT', () => {
      const context: ExpressionContext = { a: true, b: false }
      expect(evaluate('{{!a}}', context)).toBe(false)
      expect(evaluate('{{!b}}', context)).toBe(true)
    })

    it('should handle complex logical expressions', () => {
      const context: ExpressionContext = { a: true, b: false, c: true }
      expect(evaluate('{{a && b || c}}', context)).toBe(true) // (true && false) || true
      expect(evaluate('{{a || b && c}}', context)).toBe(true) // true || (false && true)
    })
  })

  describe('ternary operator', () => {
    it('should handle ternary expressions', () => {
      const context: ExpressionContext = { age: 20 }
      expect(evaluate('{{age >= 18 ? "adult" : "minor"}}', context)).toBe('adult')
    })

    it('should handle ternary with false condition', () => {
      const context: ExpressionContext = { age: 15 }
      expect(evaluate('{{age >= 18 ? "adult" : "minor"}}', context)).toBe('minor')
    })

    it('should handle nested ternary', () => {
      const context: ExpressionContext = { score: 85 }
      expect(evaluate('{{score >= 90 ? "A" : score >= 80 ? "B" : "C"}}', context)).toBe('B')
    })

    it('should handle ternary with numeric results', () => {
      const context: ExpressionContext = { x: 10 }
      expect(evaluate('{{x > 5 ? 100 : 0}}', context)).toBe(100)
    })
  })

  describe('string operations', () => {
    it('should handle string concatenation with +', () => {
      const context: ExpressionContext = { first: 'Hello', last: 'World' }
      expect(evaluate('{{first + " " + last}}', context)).toBe('Hello World')
    })

    it('should handle string literals', () => {
      const context: ExpressionContext = { name: 'Alice' }
      expect(evaluate('{{"Hello " + name}}', context)).toBe('Hello Alice')
      expect(evaluate("{{name + ' says hi'}}",context)).toBe('Alice says hi')
    })

    it('should convert numbers to strings in concatenation', () => {
      const context: ExpressionContext = { age: 30 }
      expect(evaluate('{{"Age: " + age}}', context)).toBe('Age: 30')
    })
  })

  describe('literals', () => {
    it('should handle number literals in expressions', () => {
      const context: ExpressionContext = { x: 10 }
      expect(evaluate('{{x + 42}}', context)).toBe(52)
      expect(evaluate('{{3.14 * 2}}', context)).toBe(6.28)
    })

    it('should handle string literals in expressions', () => {
      const context: ExpressionContext = { name: 'Alice' }
      expect(evaluate('{{"hello" + " " + name}}', context)).toBe('hello Alice')
      expect(evaluate("{{name + ' world'}}", context)).toBe('Alice world')
    })

    it('should handle boolean literals in expressions', () => {
      const context: ExpressionContext = {}
      expect(evaluate('{{true && true}}', context)).toBe(true)
      expect(evaluate('{{false || true}}', context)).toBe(true)
    })

    it('should handle null literal in expressions', () => {
      const context: ExpressionContext = { x: null }
      expect(evaluate('{{x === null}}', context)).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle non-string input', () => {
      const context: ExpressionContext = {}
      expect(evaluate(42 as any, context)).toBe(42)
      expect(evaluate(true as any, context)).toBe(true)
      expect(evaluate(null as any, context)).toBe(null)
    })

    it('should handle empty context', () => {
      const context: ExpressionContext = {}
      expect(evaluate('{{missing}}', context)).toBeUndefined()
    })

    it('should handle complex nested expressions', () => {
      const context: ExpressionContext = {
        items: [{ price: 10 }, { price: 20 }],
        discount: 0.1
      }
      // This would need array support, but testing what we have
      expect(evaluate('{{discount * 100}}', context)).toBe(10)
    })

    it('should handle whitespace in expressions', () => {
      const context: ExpressionContext = { a: 5, b: 3 }
      expect(evaluate('{{ a + b }}', context)).toBe(8)
      expect(evaluate('{{  a  *  b  }}', context)).toBe(15)
    })
  })
})

