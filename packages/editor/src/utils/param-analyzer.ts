import type { ComponentNode } from '@forgestudio/protocol'

/**
 * 分析组件树，提取所有引用的参数
 * 例如：{{$route.id}} → 'id'
 */
export function analyzeRequiredParams(componentTree: ComponentNode | null): Set<string> {
  const params = new Set<string>()

  if (!componentTree) return params

  // 递归遍历组件树
  function traverse(node: ComponentNode) {
    // 检查 props 中的表达式
    if (node.props) {
      Object.values(node.props).forEach(propValue => {
        if (typeof propValue === 'string') {
          extractParams(propValue, params)
        } else if (typeof propValue === 'object' && propValue !== null) {
          // 处理嵌套对象
          JSON.stringify(propValue).match(/\{\{[^}]+\}\}/g)?.forEach(expr => {
            extractParams(expr, params)
          })
        }
      })
    }

    // 递归处理子组件
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => {
        if (typeof child === 'object' && child !== null) {
          traverse(child)
        }
      })
    }
  }

  traverse(componentTree)
  return params
}

/**
 * 从表达式中提取参数名
 * 例如：{{$param.id}} → 'id'
 *       {{$param.name}} → 'name'
 */
function extractParams(expr: string, params: Set<string>) {
  // 匹配 $param.xxx 模式
  const paramPattern = /\$param\.(\w+)/g
  let match

  while ((match = paramPattern.exec(expr)) !== null) {
    params.add(match[1])
  }
}

/**
 * 分析数据源依赖的参数
 */
export function analyzeDataSourceParams(dataSources: Array<{ options?: { url?: string } }>): Set<string> {
  const params = new Set<string>()

  dataSources.forEach(ds => {
    if (ds.options?.url) {
      extractParams(ds.options.url, params)
    }
  })

  return params
}
