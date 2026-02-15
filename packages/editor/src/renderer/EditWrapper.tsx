import React from 'react'
import type { ComponentNode } from '@forgestudio/protocol'
import { useEditorStore } from '../store'

interface EditWrapperProps {
  node: ComponentNode
  children: React.ReactNode
}

export function EditWrapper({ node, children }: EditWrapperProps) {
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId)
  const selectNode = useEditorStore((s) => s.selectNode)
  const isSelected = selectedNodeId === node.id

  return (
    <div
      className={`forge-edit-wrapper ${isSelected ? 'forge-edit-wrapper--selected' : ''}`}
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
