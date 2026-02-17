import { useEffect } from 'react'
import { useEditorStore } from '../store'
import { findNodeById } from '@forgestudio/protocol'

export function useKeyboardShortcuts() {
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

      // Read latest state inside handler to avoid stale closures
      const state = useEditorStore.getState()

      // Ctrl+Z - Undo
      if (ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        state.undo()
        return
      }

      // Ctrl+Shift+Z or Ctrl+Y - Redo
      if ((ctrlKey && e.key === 'z' && e.shiftKey) || (ctrlKey && e.key === 'y')) {
        e.preventDefault()
        state.redo()
        return
      }

      // Ctrl+C - Copy
      if (ctrlKey && e.key === 'c' && state.selectedNodeId) {
        e.preventDefault()
        state.copyNode(state.selectedNodeId)
        return
      }

      // Ctrl+V - Paste
      if (ctrlKey && e.key === 'v' && state.selectedNodeId && state.clipboard) {
        e.preventDefault()
        state.pasteNode()
        return
      }

      // Delete - Remove selected node
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedNodeId) {
        const node = findNodeById(state.schema.componentTree, state.selectedNodeId)
        if (node && node.component !== 'Page') {
          e.preventDefault()
          state.removeNode(state.selectedNodeId)
        }
        return
      }

      // Ctrl+S - Export (save)
      if (ctrlKey && e.key === 's') {
        e.preventDefault()
        const schema = state.exportSchema()
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
  }, []) // Stable: all state read via getState() inside handler
}
