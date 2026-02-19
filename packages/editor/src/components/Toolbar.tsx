import React, { useRef } from 'react'
import { useEditorStore } from '../store'

export function Toolbar() {
  const exportSchema = useEditorStore((s) => s.exportSchema)
  const importSchema = useEditorStore((s) => s.importSchema)
  const generateCode = useEditorStore((s) => s.generateCode)
  const setRightPanelTab = useEditorStore((s) => s.setRightPanelTab)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const canUndo = useEditorStore((s) => s.historyIndex > 0)
  const canRedo = useEditorStore((s) => s.historyIndex < s.history.length - 1)
  const copyNode = useEditorStore((s) => s.copyNode)
  const pasteNode = useEditorStore((s) => s.pasteNode)
  const canPaste = useEditorStore((s) => s.clipboard !== null && s.selectedNodeId !== null)
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId)
  const schema = useEditorStore((s) => s.schema)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    const schema = exportSchema()
    const json = JSON.stringify(schema, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${schema.meta.name || 'page'}.fsp.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const schema = JSON.parse(reader.result as string)
        importSchema(schema)
      } catch {
        alert('JSON 解析失败，请检查文件格式')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="forge-editor-toolbar">
      <div className="forge-editor-toolbar__brand">ForgeStudio</div>
      <div className="forge-editor-toolbar__actions">
        <button
          className="forge-editor-btn"
          onClick={undo}
          disabled={!canUndo}
          title="撤销 (Ctrl+Z)"
        >
          ↶ 撤销
        </button>
        <button
          className="forge-editor-btn"
          onClick={redo}
          disabled={!canRedo}
          title="重做 (Ctrl+Shift+Z)"
        >
          ↷ 重做
        </button>
        <div style={{ width: 1, height: 20, backgroundColor: '#ddd', margin: '0 8px' }} />
        <button
          className="forge-editor-btn"
          onClick={() => selectedNodeId && copyNode(selectedNodeId)}
          disabled={!selectedNodeId || (selectedNodeId === schema.componentTree?.id)}
          title="复制 (Ctrl+C)"
        >
          复制
        </button>
        <button
          className="forge-editor-btn"
          onClick={pasteNode}
          disabled={!canPaste}
          title="粘贴 (Ctrl+V)"
        >
          粘贴
        </button>
        <div style={{ width: 1, height: 20, backgroundColor: '#ddd', margin: '0 8px' }} />
        <button className="forge-editor-btn" onClick={handleImport}>
          导入
        </button>
        <button className="forge-editor-btn" onClick={handleExport}>
          导出
        </button>
        <button
          className="forge-editor-btn forge-editor-btn--primary"
          onClick={generateCode}
        >
          生成 Taro 代码
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  )
}
