import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useEditorStore } from '../store'
import { NodeRenderer } from '../renderer/Renderer'

export function Canvas() {
  const schema = useEditorStore((s) => s.schema)
  const selectNode = useEditorStore((s) => s.selectNode)

  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-root',
    data: { type: 'canvas', parentId: schema.componentTree?.id },
  })

  if (!schema.componentTree) {
    return (
      <div className="forge-editor-canvas">
        <div className="forge-editor-panel__empty">
          加载中...
        </div>
      </div>
    )
  }

  return (
    <div
      className="forge-editor-canvas"
      onClick={() => selectNode(null)}
    >
      <div
        ref={setNodeRef}
        className={`forge-editor-canvas__inner ${isOver ? 'forge-editor-canvas__inner--over' : ''}`}
      >
        <NodeRenderer node={schema.componentTree} />
      </div>
    </div>
  )
}
