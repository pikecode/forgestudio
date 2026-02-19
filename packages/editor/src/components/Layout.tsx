import React from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core'
import { useEditorStore } from '../store'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { ComponentPanel } from './ComponentPanel'
import { Canvas } from './Canvas'
import { PropsPanel } from './props-panel'
import { CodePreviewPanel } from './CodePreviewPanel'
import { DataSourcePanel } from './DataSourcePanel'
import { Toolbar } from './Toolbar'
import { TreePanel } from './TreePanel'
import { PageManager } from './PageManager'

function useRecoveryToast() {
  React.useEffect(() => {
    const stored = localStorage.getItem('forgestudio-editor')
    if (!stored) return
    const toast = document.createElement('div')
    toast.textContent = '已恢复上次编辑内容'
    toast.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);background:#3b82f6;color:#fff;padding:6px 16px;border-radius:6px;font-size:13px;z-index:10000;transition:opacity .3s'
    document.body.appendChild(toast)
    setTimeout(() => { toast.style.opacity = '0' }, 2000)
    setTimeout(() => toast.remove(), 2400)
  }, [])
}

// Helper to check if targetId is a descendant of nodeId
function isDescendant(root: any, nodeId: string, targetId: string): boolean {
  const findNode = (node: any, id: string): any => {
    if (node.id === id) return node
    if (node.children) {
      for (const child of node.children) {
        const found = findNode(child, id)
        if (found) return found
      }
    }
    return null
  }

  const checkDescendant = (node: any, targetId: string): boolean => {
    if (node.id === targetId) return true
    if (node.children) {
      for (const child of node.children) {
        if (checkDescendant(child, targetId)) return true
      }
    }
    return false
  }

  const draggedNode = findNode(root, nodeId)
  if (!draggedNode) return false
  return checkDescendant(draggedNode, targetId)
}

export function EditorLayout() {
  const addNode = useEditorStore((s) => s.addNode)
  const moveNode = useEditorStore((s) => s.moveNode)
  const schema = useEditorStore((s) => s.schema)
  const rightPanelTab = useEditorStore((s) => s.rightPanelTab)
  const [draggingName, setDraggingName] = React.useState<string | null>(null)

  // Enable keyboard shortcuts
  useKeyboardShortcuts()
  useRecoveryToast()

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

    // Dragging tree node to reorder
    if (activeData?.type === 'tree-node' && overData?.type === 'tree-drop') {
      const draggedNodeId = activeData.nodeId as string
      const targetNodeId = overData.nodeId as string

      // Don't allow dropping onto self
      if (draggedNodeId === targetNodeId) return

      // Don't allow dropping onto own descendants (would create cycle)
      if (isDescendant(schema.componentTree, draggedNodeId, targetNodeId)) return

      // Move node to become child of target (append to end)
      if (overData.canHaveChildren) {
        moveNode(draggedNodeId, targetNodeId, 999) // Large index = append
      }
    }
    // Dragging from palette onto canvas or node
    else if (activeData?.type === 'palette') {
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
          <div className="forge-editor__left-panels">
            <PageManager />
            <ComponentPanel />
            <TreePanel />
          </div>
          <Canvas />
          {rightPanelTab === 'props' && <PropsPanel />}
          {rightPanelTab === 'datasource' && <DataSourcePanel />}
          {rightPanelTab === 'code' && <CodePreviewPanel />}
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
