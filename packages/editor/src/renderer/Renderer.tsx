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
      return (
        <div style={style}>
          {(node.children ?? []).map((child) => (
            <NodeRenderer key={child.id} node={child} context={context} />
          ))}
        </div>
      )

    case 'Card':
      return (
        <div style={style}>
          {(node.children ?? []).map((child) => (
            <NodeRenderer key={child.id} node={child} context={context} />
          ))}
        </div>
      )

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
      // No data - show placeholder
      return (
        <EditWrapper node={node}>
          <div style={{ ...node.styles as React.CSSProperties, padding: 12, background: '#f9f9f9', border: '1px dashed #ddd' }}>
            <div style={{ color: '#999', fontSize: 12 }}>列表（无数据）</div>
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
              <div key={index}>
                {(node.children ?? []).map((child) => (
                  <NodeRenderer key={`${child.id}-${index}`} node={child} context={itemContext} />
                ))}
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
