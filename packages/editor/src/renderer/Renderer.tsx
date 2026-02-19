import React from 'react'
import type { ComponentNode } from '@forgestudio/protocol'
import { getEffectiveDataSources } from '@forgestudio/protocol'
import { EditWrapper } from './EditWrapper'
import { evaluate, hasExpression, type ExpressionContext } from '@forgestudio/data-binding'
import { useEditorStore } from '../store'

/** Map FSP component names to simple HTML renderers for the editor canvas */
function renderComponent(node: ComponentNode, context?: ExpressionContext): React.ReactNode {
  const style = node.styles as React.CSSProperties

  // Evaluate props with context
  const evaluatedProps = { ...node.props }
  if (context) {
    for (const [key, value] of Object.entries(evaluatedProps)) {
      if (hasExpression(value)) {
        evaluatedProps[key] = evaluate(value as string, context)
      }
    }
  }

  switch (node.component) {
    case 'Page':
      return (
        <div className="forge-canvas" style={{ ...style, minHeight: 600 }}>
          {(node.children ?? []).map((child) => (
            <NodeRenderer key={child.id} node={child} context={context} />
          ))}
          {(!node.children || node.children.length === 0) && (
            <div className="forge-canvas__empty">从左侧拖入组件开始搭建</div>
          )}
        </div>
      )

    case 'View':
      return (
        <div style={style}>
          {(node.children ?? []).map((child) => (
            <NodeRenderer key={child.id} node={child} context={context} />
          ))}
        </div>
      )

    case 'List':
      // If List has loop binding, don't render children here (NodeRenderer handles it)
      // This case is only for editing the List template before binding
      return (
        <div style={style}>
          {(node.children ?? []).map((child) => (
            <NodeRenderer key={child.id} node={child} context={context} />
          ))}
        </div>
      )

    case 'Card': {
      const title = evaluatedProps.title ? String(evaluatedProps.title) : ''
      return (
        <div style={style}>
          {title && (
            <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 14 }}>
              {title}
            </div>
          )}
          {(node.children ?? []).map((child) => (
            <NodeRenderer key={child.id} node={child} context={context} />
          ))}
        </div>
      )
    }

    case 'Text':
      return (
        <span style={style}>
          {String(evaluatedProps.content ?? '')}
        </span>
      )

    case 'Image': {
      const src = String(evaluatedProps.src ?? '')
      return src ? (
        <img
          src={src}
          alt=""
          style={{
            ...style,
            objectFit: (evaluatedProps.fit as string) === 'width' ? 'contain' : (evaluatedProps.fit as React.CSSProperties['objectFit']) ?? 'cover',
            display: 'block',
          }}
        />
      ) : (
        <div
          style={{
            ...style,
            background: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            fontSize: 12,
          }}
        >
          图片占位
        </div>
      )
    }

    case 'Button': {
      const btnType = evaluatedProps.type as string
      const bg =
        btnType === 'primary'
          ? '#07c160'
          : btnType === 'warn'
            ? '#e64340'
            : '#f2f2f2'
      const color = btnType === 'default' ? '#333' : '#fff'
      return (
        <button
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: 4,
            background: bg,
            color,
            cursor: 'pointer',
            fontSize: 14,
            ...style,
          }}
        >
          {String(evaluatedProps.text ?? '按钮')}
        </button>
      )
    }

    case 'Input':
      return (
        <input
          type={String(evaluatedProps.type ?? 'text')}
          placeholder={String(evaluatedProps.placeholder ?? '')}
          style={{
            padding: '6px 8px',
            border: '1px solid #ddd',
            borderRadius: 4,
            fontSize: 14,
            width: '100%',
            boxSizing: 'border-box',
            ...style,
          }}
          readOnly
        />
      )

    case 'Switch':
      return (
        <div
          style={{
            display: 'inline-block',
            width: 52,
            height: 32,
            borderRadius: 16,
            background: evaluatedProps.checked ? '#07c160' : '#ddd',
            position: 'relative',
            cursor: 'pointer',
            transition: 'background 0.3s',
            ...style,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 2,
              left: evaluatedProps.checked ? 22 : 2,
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: '#fff',
              transition: 'left 0.3s',
            }}
          />
        </div>
      )

    case 'Textarea':
      return (
        <textarea
          placeholder={String(evaluatedProps.placeholder ?? '')}
          maxLength={Number(evaluatedProps.maxlength ?? 200)}
          style={{
            padding: '6px 8px',
            border: '1px solid #ddd',
            borderRadius: 4,
            fontSize: 14,
            width: '100%',
            minHeight: 80,
            boxSizing: 'border-box',
            resize: 'vertical',
            fontFamily: 'inherit',
            ...style,
          }}
          readOnly
        />
      )

    case 'ScrollView':
      return (
        <div
          style={{
            ...style,
            overflow: evaluatedProps.scrollY ? 'auto' : evaluatedProps.scrollX ? 'auto' : 'hidden',
            overflowX: evaluatedProps.scrollX ? 'auto' : 'hidden',
            overflowY: evaluatedProps.scrollY ? 'auto' : 'hidden',
          }}
        >
          {(node.children ?? []).map((child) => (
            <NodeRenderer key={child.id} node={child} context={context} />
          ))}
        </div>
      )

    case 'Form':
      return (
        <div style={{ ...style, border: '1px dashed #ccc', padding: 12 }}>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>表单容器</div>
          {(node.children ?? []).map((child) => (
            <NodeRenderer key={child.id} node={child} context={context} />
          ))}
        </div>
      )

    case 'Swiper':
      return (
        <div
          style={{
            ...style,
            position: 'relative',
            overflow: 'hidden',
            background: '#f5f5f5',
          }}
        >
          <div style={{ fontSize: 12, color: '#999', padding: 8 }}>
            轮播容器 (预览模式显示第一项)
          </div>
          {node.children && node.children.length > 0 && (
            <NodeRenderer key={node.children[0].id} node={node.children[0]} context={context} />
          )}
        </div>
      )

    case 'SwiperItem':
      return (
        <div style={{ ...style, width: '100%', height: '100%' }}>
          {(node.children ?? []).map((child) => (
            <NodeRenderer key={child.id} node={child} context={context} />
          ))}
        </div>
      )

    case 'Modal':
      return evaluatedProps.visible ? (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 16,
              minWidth: 300,
              maxWidth: '80%',
              ...style,
            }}
          >
            {evaluatedProps.title ? (
              <div style={{ fontWeight: 'bold', marginBottom: 12, fontSize: 16 }}>
                {String(evaluatedProps.title)}
              </div>
            ) : null}
            {(node.children ?? []).map((child) => (
              <NodeRenderer key={child.id} node={child} context={context} />
            ))}
          </div>
        </div>
      ) : null

    default:
      return <div style={style}>[{node.component}]</div>
  }
}

export function NodeRenderer({ node, context }: { node: ComponentNode; context?: ExpressionContext }) {
  const schema = useEditorStore((s) => s.schema)
  const currentPageId = useEditorStore((s) => s.currentPageId)
  const currentPage = currentPageId ? schema.pages?.find(p => p.id === currentPageId) ?? null : null

  // Get effective data sources (page-level + referenced globals)
  const effectiveDataSources = currentPageId ? getEffectiveDataSources(schema, currentPageId) : []

  // Build $state context from formStates (M4: use page-level)
  const stateContext: Record<string, any> = {}
  const pageFormStates = currentPage?.formStates ?? []
  for (const fs of pageFormStates) {
    stateContext[fs.id] = fs.defaultValue
  }

  // Build $param context for preview (mock parameters)
  // In real app, these come from URL query params
  // Dynamically detect required params from data sources
  const paramContext: Record<string, any> = {}
  for (const ds of effectiveDataSources) {
    const url = ds.options?.url || ''
    const paramMatches = url.matchAll(/\{\{\$param\.(\w+)\}\}/g)
    for (const match of paramMatches) {
      const paramName = match[1]
      // Provide mock value based on param name
      if (!paramContext[paramName]) {
        paramContext[paramName] = paramName === 'id' ? '1' : `mock_${paramName}`
      }
    }
  }

  // Merge context with $state and $param
  const fullContext: ExpressionContext = {
    ...context,
    $state: stateContext,
    $param: paramContext,
  }

  // Handle conditional rendering (M1.5) - now supports complex expressions
  if (node.condition) {
    const expr = node.condition.expression
    let shouldRender = false

    // Wrap expression in {{}} if not already wrapped
    const wrappedExpr = expr.startsWith('{{') ? expr : `{{${expr}}}`

    try {
      const result = evaluate(wrappedExpr, fullContext)
      // Truthy check
      shouldRender = !!result && result !== '' && result !== 0
    } catch (e) {
      console.warn('Failed to evaluate condition:', expr, e)
      shouldRender = false
    }

    if (!shouldRender) {
      // Don't render - show placeholder in editor
      return (
        <EditWrapper node={node}>
          <div style={{
            ...node.styles as React.CSSProperties,
            padding: 8,
            background: '#f0f0f0',
            border: '1px dashed #ccc',
            borderRadius: 4,
            opacity: 0.5
          }}>
            <div style={{ fontSize: 11, color: '#999' }}>
              🚫 条件不满足: {node.condition.expression}
            </div>
          </div>
        </EditWrapper>
      )
    }
  }

  // Handle loop rendering (M4: use effective dataSources including globals)
  if (node.loop) {
    const dataSource = effectiveDataSources.find((ds) => ds.id === node.loop?.dataSourceId)
    const sampleData = dataSource?.sampleData ?? []
    const items = sampleData.slice(0, 3) // Preview 3 items

    if (items.length === 0) {
      // No data - show helpful placeholder
      const dsName = dataSource?.id || node.loop?.dataSourceId
      return (
        <EditWrapper node={node}>
          <div style={{
            ...node.styles as React.CSSProperties,
            padding: 16,
            background: '#fefce8',
            border: '1px dashed #facc15',
            borderRadius: 4
          }}>
            <div style={{ color: '#854d0e', fontSize: 13, marginBottom: 4 }}>
              ⚠️ 列表无数据
            </div>
            <div style={{ color: '#a16207', fontSize: 12 }}>
              数据源 "{dsName}" 的 sampleData 为空
            </div>
            <div style={{ color: '#a16207', fontSize: 11, marginTop: 6 }}>
              请在"数据源"标签页编辑 Mock 数据，例如：
            </div>
            <pre style={{
              fontSize: 10,
              background: '#fef9c3',
              padding: 6,
              marginTop: 4,
              borderRadius: 2,
              overflow: 'auto'
            }}>
{`[
  {"id": 1, "title": "示例1"},
  {"id": 2, "title": "示例2"}
]`}
            </pre>
          </div>
        </EditWrapper>
      )
    }

    return (
      <EditWrapper node={node}>
        <div style={node.styles as React.CSSProperties}>
          {items.map((item: any, index: number) => {
            const itemContext: ExpressionContext = { $item: item, ...fullContext }
            return (
              <div key={index} style={{ marginBottom: 4 }}>
                {(node.children ?? []).map((child) => {
                  // First item: use NodeRenderer so children are selectable/editable
                  if (index === 0) {
                    return <NodeRenderer key={child.id} node={child} context={itemContext} />
                  }
                  // Other items: render-only preview
                  return <div key={`${child.id}-${index}`}>{renderComponent(child, itemContext)}</div>
                })}
              </div>
            )
          })}
        </div>
      </EditWrapper>
    )
  }

  // Page is the root — don't wrap it in EditWrapper
  if (node.component === 'Page') {
    return <>{renderComponent(node, fullContext)}</>
  }

  return <EditWrapper node={node}>{renderComponent(node, fullContext)}</EditWrapper>
}
