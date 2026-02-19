import { useEffect } from 'react'
import { useEditorStore } from '../store'
import { findNodeById } from '@forgestudio/protocol'

function showSaveToast() {
  const existing = document.querySelector('.forge-save-toast')
  if (existing) existing.remove()
  const toast = document.createElement('div')
  toast.className = 'forge-save-toast'
  toast.textContent = '已自动保存'
  toast.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);background:#10b981;color:#fff;padding:6px 16px;border-radius:6px;font-size:13px;z-index:10000;transition:opacity .3s'
  document.body.appendChild(toast)
  setTimeout(() => { toast.style.opacity = '0' }, 1200)
  setTimeout(() => toast.remove(), 1600)
}

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

      // Ctrl+Shift+S - Export file
      if (ctrlKey && e.key === 's' && e.shiftKey) {
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

      // Ctrl+S - Show auto-save toast (data is persisted automatically)
      if (ctrlKey && e.key === 's') {
        e.preventDefault()
        showSaveToast()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, []) // Stable: all state read via getState() inside handler
}
