import React, { useState } from 'react'
import type { ComponentNode } from '@forgestudio/protocol'
import { getComponentMeta } from '@forgestudio/components'
import { useEditorStore } from '../store'

interface TreeNodeProps {
  node: ComponentNode
  level: number
}

function TreeNode({ node, level }: TreeNodeProps) {
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId)
  const selectNode = useEditorStore((s) => s.selectNode)
  const [collapsed, setCollapsed] = useState(false)

  const meta = getComponentMeta(node.component)
  const hasChildren = node.children && node.children.length > 0
  const isSelected = selectedNodeId === node.id

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    selectNode(node.id)
  }

  const toggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCollapsed(!collapsed)
  }

  return (
    <div>
      <div
        onClick={handleClick}
        style={{
          paddingLeft: level * 16 + 8,
          paddingRight: 8,
          paddingTop: 4,
          paddingBottom: 4,
          cursor: 'pointer',
          background: isSelected ? '#e6f7ff' : 'transparent',
          borderLeft: isSelected ? '3px solid #1890ff' : '3px solid transparent',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 13,
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.background = '#f5f5f5'
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.background = 'transparent'
          }
        }}
      >
        {hasChildren && (
          <span
            onClick={toggleCollapse}
            style={{
              width: 16,
              height: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            {collapsed ? '▶' : '▼'}
          </span>
        )}
        {!hasChildren && <span style={{ width: 16 }} />}
        <span style={{ fontWeight: 500, color: '#333' }}>
          {meta?.title || node.component}
        </span>
        <span style={{ fontSize: 11, color: '#999' }}>#{node.id}</span>
      </div>
      {hasChildren && !collapsed && (
        <div>
          {node.children!.map((child) => (
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function TreePanel() {
  const schema = useEditorStore((s) => s.schema)

  if (!schema.componentTree) {
    return (
      <div className="forge-editor-panel forge-editor-panel--left">
        <div className="forge-editor-panel__title">组件树</div>
        <div className="forge-editor-panel__empty">加载中...</div>
      </div>
    )
  }

  return (
    <div className="forge-editor-panel forge-editor-panel--left">
      <div className="forge-editor-panel__title">组件树</div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        <TreeNode node={schema.componentTree} level={0} />
      </div>
    </div>
  )
}
