import React from 'react'
import type { ComponentNode } from '@forgestudio/protocol'
import { EditWrapper } from './EditWrapper'

/** Map FSP component names to simple HTML renderers for the editor canvas */
function renderComponent(node: ComponentNode): React.ReactNode {
  const style = node.styles as React.CSSProperties

  switch (node.component) {
    case 'Page':
      return (
        <div className="forge-canvas" style={{ ...style, minHeight: 600 }}>
          {(node.children ?? []).map((child) => (
            <NodeRenderer key={child.id} node={child} />
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
            <NodeRenderer key={child.id} node={child} />
          ))}
        </div>
      )

    case 'Text':
      return (
        <span style={style}>
          {String(node.props.content ?? '')}
        </span>
      )

    case 'Image': {
      const src = String(node.props.src ?? '')
      return src ? (
        <img
          src={src}
          alt=""
          style={{
            ...style,
            objectFit: (node.props.fit as string) === 'width' ? 'contain' : (node.props.fit as React.CSSProperties['objectFit']) ?? 'cover',
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
      const btnType = node.props.type as string
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
          {String(node.props.text ?? '按钮')}
        </button>
      )
    }

    case 'Input':
      return (
        <input
          type={String(node.props.type ?? 'text')}
          placeholder={String(node.props.placeholder ?? '')}
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

export function NodeRenderer({ node }: { node: ComponentNode }) {
  // Page is the root — don't wrap it in EditWrapper
  if (node.component === 'Page') {
    return <>{renderComponent(node)}</>
  }

  return <EditWrapper node={node}>{renderComponent(node)}</EditWrapper>
}
