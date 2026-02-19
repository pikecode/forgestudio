import React, { useState } from 'react'
import type { ComponentNode } from '@forgestudio/protocol'
import { getComponentMeta } from '@forgestudio/components'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { useEditorStore } from '../store'

interface TreeNodeProps {
  node: ComponentNode
  level: number
  parentId: string
  index: number
}

function TreeNode({ node, level, parentId, index }: TreeNodeProps) {
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId)
  const selectNode = useEditorStore((s) => s.selectNode)
  const [collapsed, setCollapsed] = useState(false)

  const meta = getComponentMeta(node.component)
  const hasChildren = node.children && node.children.length > 0
  const isSelected = selectedNodeId === node.id
  const canHaveChildren = meta?.allowChildren !== false

  // Make this node draggable (except root)
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `tree-${node.id}`,
    data: {
      type: 'tree-node',
      nodeId: node.id,
      parentId,
      index,
    },
    disabled: node.component === 'Page', // Don't allow dragging root node
  })

  // Make this node droppable (if it can have children)
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `tree-drop-${node.id}`,
    data: {
      type: 'tree-drop',
      nodeId: node.id,
      canHaveChildren,
    },
    disabled: !canHaveChildren,
  })

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    selectNode(node.id)
  }

  const toggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCollapsed(!collapsed)
  }

  // Combine drag and drop refs
  const combinedRef = (el: HTMLDivElement | null) => {
    setDragRef(el)
    setDropRef(el)
  }

  return (
    <div>
      <div
        ref={combinedRef}
        className={`forge-tree-node${isSelected ? ' forge-tree-node--selected' : ''}${isOver && canHaveChildren ? ' forge-tree-node--drop-target' : ''}`}
        style={{
          paddingLeft: level * 16 + 8,
          paddingRight: 8,
          paddingTop: 4,
          paddingBottom: 4,
          cursor: isDragging ? 'grabbing' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 13,
          transition: 'background 0.15s',
          opacity: isDragging ? 0.5 : 1,
        }}
      >
        {/* Drag handle - separated from click area */}
        <span
          {...attributes}
          {...listeners}
          style={{
            width: 16,
            height: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
            userSelect: 'none',
            marginRight: 4,
          }}
          title="拖拽移动"
        >
          ⋮⋮
        </span>
        {hasChildren && (
          <span
            onClick={toggleCollapse}
            onPointerDown={(e) => e.stopPropagation()}
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
        <span
          onClick={handleClick}
          style={{ fontWeight: 500, color: '#333', flex: 1, cursor: 'pointer' }}
        >
          {meta?.title || node.component}
        </span>
        <span
          onClick={handleClick}
          style={{ fontSize: 11, color: '#999', cursor: 'pointer' }}
        >#{node.id}</span>
      </div>
      {hasChildren && !collapsed && (
        <div>
          {node.children!.map((child, idx) => (
            <TreeNode key={child.id} node={child} level={level + 1} parentId={node.id} index={idx} />
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
      <div className="forge-editor-panel__title">组件树 <span style={{ fontSize: 11, color: '#999' }}>(可拖拽排序)</span></div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        <TreeNode node={schema.componentTree} level={0} parentId="" index={0} />
      </div>
    </div>
  )
}
