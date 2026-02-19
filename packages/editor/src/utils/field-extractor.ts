import type { FieldSchema } from '@forgestudio/protocol'

/**
 * 从 API 响应数据中提取数组
 * 支持多种格式：
 * - 直接数组: [...]
 * - 包装对象: {data: [...], list: [...], items: [...], results: [...]}
 */
export function extractListFromResponse(data: unknown): any[] {
  if (Array.isArray(data)) {
    return data
  }

  if (data && typeof data === 'object') {
    const obj = data as Record<string, any>
    // 优先匹配常见的数组字段名（支持两层嵌套）
    const arrayFields = ['data', 'list', 'items', 'results', 'records', 'rows']

    for (const field of arrayFields) {
      if (Array.isArray(obj[field])) return obj[field]
    }

    // 检查嵌套：data.list, data.items 等
    if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
      for (const field of arrayFields) {
        if (Array.isArray(obj.data[field])) return obj.data[field]
      }
    }

    // 回退：第一个找到的数组值
    for (const val of Object.values(obj)) {
      if (Array.isArray(val)) return val
    }
  }

  return []
}

/**
 * 推断 JavaScript 值的类型
 */
function inferType(value: unknown): FieldSchema['type'] {
  if (value === null || value === undefined) {
    return 'string' // 默认
  }

  if (Array.isArray(value)) {
    return 'array'
  }

  const type = typeof value
  switch (type) {
    case 'string':
      return 'string'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'object':
      return 'object'
    default:
      return 'string'
  }
}

/**
 * 从对象中提取字段 schema
 */
function extractFieldsFromObject(obj: Record<string, any>): FieldSchema[] {
  const fields: FieldSchema[] = []
  for (const [key, value] of Object.entries(obj)) {
    fields.push({
      name: key,
      type: inferType(value),
    })
  }
  return fields
}

/**
 * 从 API 返回数据中提取字段 schema
 * 支持数组和单对象两种格式
 * @param data API 响应数据
 * @returns 字段 schema 列表
 */
export function extractFieldsFromData(data: unknown): FieldSchema[] {
  // 尝试提取数组
  const list = extractListFromResponse(data)

  if (list.length > 0) {
    const firstItem = list[0]
    if (firstItem && typeof firstItem === 'object') {
      return extractFieldsFromObject(firstItem)
    }
  }

  // 如果不是数组，尝试作为单对象处理
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return extractFieldsFromObject(data as Record<string, any>)
  }

  console.warn('Unable to extract fields from response data')
  return []
}
