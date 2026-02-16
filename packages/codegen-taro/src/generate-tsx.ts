import type {
  IRPage,
  IRRenderNode,
  IRTextContent,
} from '@forgestudio/codegen-core'
import { getTaroMapping } from './component-map'
import { mapProps } from './prop-map'

export function generateTSX(ir: IRPage): string {
  // Collect all unique Taro component imports
  const usedComponents = new Set<string>()
  collectTags(ir.renderTree, usedComponents)

  const componentImports = Array.from(usedComponents).sort()
  const importLine = `import { ${componentImports.join(', ')} } from '@tarojs/components'`

  const jsx = renderNode(ir.renderTree, 2)

  return `${importLine}
import './index.scss'

export default function Index() {
  return (
${jsx}
  )
}
`
}

function collectTags(node: IRRenderNode, set: Set<string>) {
  const { taroTag } = getTaroMapping(node.tag)
  set.add(taroTag)
  for (const child of node.children) {
    if ('tag' in child) collectTags(child, set)
  }
}

function renderNode(node: IRRenderNode, indent: number): string {
  const pad = ' '.repeat(indent)
  const { taroTag } = getTaroMapping(node.tag)
  const propsStr = buildPropsString(taroTag, node)

  // Self-closing if no children
  if (node.children.length === 0) {
    return `${pad}<${taroTag}${propsStr} />`
  }

  // Children
  const childrenStr = node.children
    .map((child) => {
      if ('type' in child && child.type === 'text') {
        return `${pad}  ${child.value}`
      }
      return renderNode(child as IRRenderNode, indent + 2)
    })
    .join('\n')

  return `${pad}<${taroTag}${propsStr}>\n${childrenStr}\n${pad}</${taroTag}>`
}

function buildPropsString(taroTag: string, node: IRRenderNode): string {
  const parts: string[] = []
  if (node.className) {
    parts.push(`className="${node.className}"`)
  }
  const mapped = mapProps(taroTag, node.props)
  for (const [k, v] of Object.entries(mapped)) {
    parts.push(`${k}=${v}`)
  }
  return parts.length > 0 ? ' ' + parts.join(' ') : ''
}
