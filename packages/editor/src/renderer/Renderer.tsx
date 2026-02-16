import React from 'react'
import type { ComponentNode } from '@forgestudio/protocol'
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

    default:
      return <div style={style}>[{node.component}]</div>
  }
}

export function NodeRenderer({ node, context }: { node: ComponentNode; context?: ExpressionContext }) {
  const schema = useEditorStore((s) => s.schema)

  // Handle loop rendering
  if (node.loop) {
    const dataSource = schema.dataSources?.find((ds) => ds.id === node.loop?.dataSourceId)
    const mockDataObj = dataSource?.mockData as { data?: any[] } | undefined
    const mockData = mockDataObj?.data ?? []
    const items = mockData.slice(0, 3) // Preview 3 items

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
              数据源 "{dsName}" 的 mockData.data 为空
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
{`{"data": [
  {"id": 1, "title": "示例1"},
  {"id": 2, "title": "示例2"}
]}`}
            </pre>
          </div>
        </EditWrapper>
      )
    }

    return (
      <EditWrapper node={node}>
        <div style={node.styles as React.CSSProperties}>
          {items.map((item: any, index: number) => {
            const itemContext: ExpressionContext = { $item: item, ...context }
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
    return <>{renderComponent(node, context)}</>
  }

  return <EditWrapper node={node}>{renderComponent(node, context)}</EditWrapper>
}
