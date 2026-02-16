import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import type { ComponentNode } from '@forgestudio/protocol'
import { useEditorStore } from '../store'
import { getComponentMeta } from '@forgestudio/components'

interface EditWrapperProps {
  node: ComponentNode
  children: React.ReactNode
}

export function EditWrapper({ node, children }: EditWrapperProps) {
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId)
  const selectNode = useEditorStore((s) => s.selectNode)
  const isSelected = selectedNodeId === node.id

  // Check if this component can accept children
  const meta = getComponentMeta(node.component)
  const canAcceptChildren = meta?.allowChildren ?? false

  // Set up droppable for container components
  const { setNodeRef, isOver } = useDroppable({
    id: `node-${node.id}`,
    data: { type: 'node', parentId: node.id },
    disabled: !canAcceptChildren,
  })

  return (
    <div
      ref={canAcceptChildren ? setNodeRef : undefined}
      className={`forge-edit-wrapper ${isSelected ? 'forge-edit-wrapper--selected' : ''} ${isOver ? 'forge-edit-wrapper--over' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        selectNode(node.id)
      }}
      data-node-id={node.id}
    >
      {children}
      {isSelected && (
        <div className="forge-edit-wrapper__label">{node.component}</div>
      )}
    </div>
  )
}
