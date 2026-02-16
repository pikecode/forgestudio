import React from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core'
import { useEditorStore } from '../store'
import { ComponentPanel } from './ComponentPanel'
import { Canvas } from './Canvas'
import { PropsPanel } from './PropsPanel'
import { CodePreviewPanel } from './CodePreviewPanel'
import { DataSourcePanel } from './DataSourcePanel'
import { PreviewPanel } from './PreviewPanel'
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

    // Dragging from palette onto canvas or node
    if (activeData?.type === 'palette') {
      const componentName = activeData.componentName as string
      let parentId: string | undefined

      if (overData?.type === 'canvas') {
        parentId = overData.parentId as string
      } else if (overData?.type === 'node') {
        parentId = overData.parentId as string
      }

      if (parentId) {
        addNode(parentId, componentName)
      }
    }
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="forge-editor">
        <Toolbar />
        <div className="forge-editor__body">
          <ComponentPanel />
          <Canvas />
          {rightPanelTab === 'props' && <PropsPanel />}
          {rightPanelTab === 'datasource' && <DataSourcePanel />}
          {rightPanelTab === 'code' && <CodePreviewPanel />}
          {rightPanelTab === 'preview' && <PreviewPanel />}
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
