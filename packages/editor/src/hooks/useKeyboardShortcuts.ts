import { useEffect } from 'react'
import { useEditorStore } from '../store'
import { findNodeById } from '@forgestudio/protocol'

export function useKeyboardShortcuts() {
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const removeNode = useEditorStore((s) => s.removeNode)
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId)
  const exportSchema = useEditorStore((s) => s.exportSchema)
  const copyNode = useEditorStore((s) => s.copyNode)
  const pasteNode = useEditorStore((s) => s.pasteNode)
  const schema = useEditorStore((s) => s.schema)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input/textarea
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey

      // Ctrl+Z - Undo
      if (ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }

      // Ctrl+Shift+Z or Ctrl+Y - Redo
      if ((ctrlKey && e.key === 'z' && e.shiftKey) || (ctrlKey && e.key === 'y')) {
        e.preventDefault()
        redo()
        return
      }

      // Ctrl+C - Copy
      if (ctrlKey && e.key === 'c' && selectedNodeId) {
        e.preventDefault()
        copyNode(selectedNodeId)
        return
      }

      // Ctrl+V - Paste
      if (ctrlKey && e.key === 'v' && selectedNodeId && useEditorStore.getState().clipboard) {
        e.preventDefault()
        pasteNode()
        return
      }

      // Delete - Remove selected node
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        // Don't delete Page root node
        const node = findNodeById(schema.componentTree, selectedNodeId)
        if (node && node.component !== 'Page') {
          e.preventDefault()
          removeNode(selectedNodeId)
        }
        return
      }

      // Ctrl+S - Export (save)
      if (ctrlKey && e.key === 's') {
        e.preventDefault()
        const schema = exportSchema()
        const json = JSON.stringify(schema, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${schema.meta.name || 'page'}.fsp.json`
        a.click()
        URL.revokeObjectURL(url)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, removeNode, selectedNodeId, exportSchema, copyNode, pasteNode, schema])
}
