import React from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core'
import { useEditorStore } from '../store'
import { ComponentPanel } from './ComponentPanel'
import { Canvas } from './Canvas'
import { PropsPanel } from './PropsPanel'
import { CodePreviewPanel } from './CodePreviewPanel'
import { Toolbar } from './Toolbar'

export function EditorLayout() {
  const addNode = useEditorStore((s) => s.addNode)
  const schema = useEditorStore((s) => s.schema)
  const rightPanelTab = useEditorStore((s) => s.rightPanelTab)
  const [draggingName, setDraggingName] = React.useState<string | null>(null)

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current
    if (data?.type === 'palette') {
      setDraggingName(data.componentName as string)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingName(null)
    const { active, over } = event
    if (!over) return

    const activeData = active.data.current
    const overData = over.data.current

    // Dragging from palette onto canvas
    if (activeData?.type === 'palette' && overData?.type === 'canvas') {
      const componentName = activeData.componentName as string
      const parentId = overData.parentId as string
      addNode(parentId, componentName)
    }
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="forge-editor">
        <Toolbar />
        <div className="forge-editor__body">
          <ComponentPanel />
          <Canvas />
          {rightPanelTab === 'props' ? <PropsPanel /> : <CodePreviewPanel />}
        </div>
      </div>
      <DragOverlay>
        {draggingName ? (
          <div className="forge-editor-drag-overlay">{draggingName}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
