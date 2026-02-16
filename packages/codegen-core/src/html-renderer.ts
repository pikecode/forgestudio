import type { IRPage, IRRenderNode, IRTextContent, IRStyleSheet, IRStateVar } from './ir'

const TAG_MAP: Record<string, string> = {
  View: 'div',
  List: 'div',
  Card: 'div',
  Text: 'span',
  Button: 'button',
  Image: 'img',
  Input: 'input',
}

function mapTag(tag: string): string {
  return TAG_MAP[tag] ?? 'div'
}

export function renderIRToHTML(ir: IRPage): string {
  const css = renderCSS(ir.styles)
  const body = renderNode(ir.renderTree, ir.stateVars)
  const scripts = renderScripts(ir)

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #333; }
img { display: block; }
button { font-size: 14px; padding: 8px 16px; border: none; border-radius: 4px; background: #f2f2f2; color: #333; cursor: pointer; }
input { font-size: 14px; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%; box-sizing: border-box; }
${css}
</style>
</head>
<body>
${body}
${scripts}
</body>
</html>`
}

function renderCSS(styles: IRStyleSheet): string {
  return styles.rules
    .map(rule => {
      const props = Object.entries(rule.properties)
        .map(([k, v]) => `  ${k}: ${v};`)
        .join('\n')
      return `${rule.selector} {\n${props}\n}`
    })
    .join('\n')
}

function renderNode(node: IRRenderNode, stateVars: IRStateVar[]): string {
  const htmlTag = mapTag(node.tag)
  const attrs = buildAttrs(htmlTag, node)
  const cls = node.className ? ` class="${node.className}"` : ''

  // Loop rendering: expand data inline
  if (node.loop) {
    const sv = stateVars.find(v => v.name === node.loop!.dataVar)
    const data = Array.isArray(sv?.defaultValue) ? sv!.defaultValue as any[] : []
    if (data.length === 0) {
      return `<${htmlTag}${cls}${attrs}><span style="color:#999;padding:16px;display:block;">暂无数据</span></${htmlTag}>`
    }
    const items = data.map((item, i) => {
      const childrenHTML = node.children
        .map(child => renderChildWithData(child, stateVars, node.loop!.itemVar, item))
        .join('\n')
      return `<${htmlTag}${cls}${attrs}>${childrenHTML}</${htmlTag}>`
    }).join('\n')
    return items
  }

  // Self-closing tags
  if (htmlTag === 'img') {
    const src = extractPropValue(node.props, 'src') || ''
    const mode = extractPropValue(node.props, 'fit') || 'cover'
    if (!src) {
      return `<div${cls} style="background:#f0f0f0;display:flex;align-items:center;justify-content:center;color:#999;font-size:12px;">图片占位</div>`
    }
    return `<img${cls} src="${escapeHTML(src)}" style="object-fit:${mode};display:block;" />`
  }

  if (htmlTag === 'input') {
    const placeholder = extractPropValue(node.props, 'placeholder') || ''
    const type = extractPropValue(node.props, 'type') || 'text'
    return `<input${cls}${attrs} type="${escapeHTML(type)}" placeholder="${escapeHTML(placeholder)}" />`
  }

  // Children
  if (node.children.length === 0) {
    // Button with text prop
    if (node.tag === 'Button') {
      const text = extractPropValue(node.props, 'text') || '按钮'
      const btnType = extractPropValue(node.props, 'type') || 'default'
      const btnStyle = buttonStyle(btnType)
      return `<button${cls}${attrs} style="${btnStyle}">${escapeHTML(text)}</button>`
    }
    return `<${htmlTag}${cls}${attrs}></${htmlTag}>`
  }

  const childrenHTML = node.children
    .map(child => {
      if ('type' in child && child.type === 'text') {
        return escapeHTML(child.value)
      }
      return renderNode(child as IRRenderNode, stateVars)
    })
    .join('\n')

  // Button wrapping
  if (node.tag === 'Button') {
    const btnType = extractPropValue(node.props, 'type') || 'default'
    const btnStyle = buttonStyle(btnType)
    return `<button${cls}${attrs} style="${btnStyle}">${childrenHTML}</button>`
  }

  return `<${htmlTag}${cls}${attrs}>${childrenHTML}</${htmlTag}>`
}

function renderChildWithData(
  child: IRRenderNode | IRTextContent,
  stateVars: IRStateVar[],
  itemVar: string,
  item: any,
): string {
  if ('type' in child && child.type === 'text') {
    return resolveExpressions(child.value, itemVar, item)
  }

  const node = child as IRRenderNode
  const htmlTag = mapTag(node.tag)
  const cls = node.className ? ` class="${node.className}"` : ''
  const attrs = buildAttrs(htmlTag, node)

  // Resolve text children with data
  if (node.children.length === 0) {
    if (node.tag === 'Button') {
      const text = extractPropValue(node.props, 'text') || '按钮'
      const resolved = resolveExpressions(text, itemVar, item)
      const btnType = extractPropValue(node.props, 'type') || 'default'
      return `<button${cls}${attrs} style="${buttonStyle(btnType)}">${resolved}</button>`
    }
    return `<${htmlTag}${cls}${attrs}></${htmlTag}>`
  }

  const childrenHTML = node.children
    .map(c => renderChildWithData(c, stateVars, itemVar, item))
    .join('\n')

  if (node.tag === 'Button') {
    const btnType = extractPropValue(node.props, 'type') || 'default'
    return `<button${cls}${attrs} style="${buttonStyle(btnType)}">${childrenHTML}</button>`
  }

  return `<${htmlTag}${cls}${attrs}>${childrenHTML}</${htmlTag}>`
}

function resolveExpressions(text: string, itemVar: string, item: any): string {
  if (!text.includes('{{')) return escapeHTML(text)
  return text.replace(/\{\{([^}]+)\}\}/g, (_, expr) => {
    const cleaned = expr.trim().replace(/^\$/, '')
    // e.g. "item.title" -> item["title"]
    const parts = cleaned.split('.')
    if (parts[0] === itemVar && parts.length > 1) {
      let val: any = item
      for (let i = 1; i < parts.length; i++) {
        val = val?.[parts[i]]
      }
      return escapeHTML(String(val ?? ''))
    }
    return escapeHTML(cleaned)
  })
}

function renderScripts(ir: IRPage): string {
  if (ir.handlers.length === 0) return ''
  const fns = ir.handlers.map(h => {
    // Convert Taro.showToast to alert
    const body = h.body
      .replace(/Taro\.showToast\(\{[^}]*title:\s*'([^']*)'[^}]*\}\)/g, "alert('$1')")
      .replace(/Taro\.navigateTo\(\{[^}]*url:\s*'([^']*)'[^}]*\}\)/g, "alert('导航到: $1')")
    return `function ${h.name}() { ${body} }`
  }).join('\n')
  return `<script>${fns}</script>`
}

function buildAttrs(htmlTag: string, node: IRRenderNode): string {
  const parts: string[] = []
  for (const [key, expr] of Object.entries(node.props)) {
    if (key === 'content' || key === 'text' || key === 'dataSourceId' || key === 'src' || key === 'fit') continue
    if (key === 'placeholder' || key === 'type') continue
    if (expr.type === 'identifier') {
      parts.push(`onclick="${expr.name}()"`)
      continue
    }
    const val = expr.value ?? expr
    if (typeof val === 'string') {
      parts.push(`${key}="${escapeHTML(val)}"`)
    }
  }
  return parts.length > 0 ? ' ' + parts.join(' ') : ''
}

function extractPropValue(props: Record<string, any>, key: string): string | undefined {
  const expr = props[key]
  if (!expr) return undefined
  const val = expr.value ?? expr
  return typeof val === 'string' ? val : String(val)
}

function buttonStyle(type: string): string {
  if (type === 'primary') return 'background:#07c160;color:#fff;padding:8px 16px;border:none;border-radius:4px;cursor:pointer;'
  if (type === 'warn') return 'background:#e64340;color:#fff;padding:8px 16px;border:none;border-radius:4px;cursor:pointer;'
  return 'background:#f2f2f2;color:#333;padding:8px 16px;border:none;border-radius:4px;cursor:pointer;'
}

function escapeHTML(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
