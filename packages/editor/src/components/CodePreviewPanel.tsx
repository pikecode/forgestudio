import React, { useState } from 'react'
import JSZip from 'jszip'
import hljs from 'highlight.js/lib/core'
import typescript from 'highlight.js/lib/languages/typescript'
import scss from 'highlight.js/lib/languages/scss'
import json from 'highlight.js/lib/languages/json'
import 'highlight.js/styles/github.css'
import { useEditorStore } from '../store'

hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('scss', scss)
hljs.registerLanguage('json', json)

export function CodePreviewPanel() {
  const generatedProject = useEditorStore((s) => s.generatedProject)
  const rightPanelTab = useEditorStore((s) => s.rightPanelTab)
  const setRightPanelTab = useEditorStore((s) => s.setRightPanelTab)
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null)

  if (!generatedProject) {
    return (
      <div className="forge-editor-panel forge-editor-panel--right">
        <div className="forge-editor-tabs">
          <button
            className={`forge-editor-tab ${rightPanelTab === 'props' ? 'forge-editor-tab--active' : ''}`}
            onClick={() => setRightPanelTab('props')}
          >
            Properties
          </button>
          <button
            className={`forge-editor-tab ${rightPanelTab === 'code' ? 'forge-editor-tab--active' : ''}`}
            onClick={() => setRightPanelTab('code')}
          >
            Code
          </button>
        </div>
        <div className="forge-editor-panel__empty">
          Click Generate Taro Code button to view generated code
        </div>
      </div>
    )
  }

  const activeFile = activeFilePath
    ? generatedProject.files.find((f) => f.path === activeFilePath)
    : generatedProject.files[0]

  const currentPath = activeFile?.path || ''
  const currentContent = activeFile?.content || ''

  const getLanguage = (path: string): string => {
    if (path.endsWith('.tsx') || path.endsWith('.ts')) return 'typescript'
    if (path.endsWith('.scss')) return 'scss'
    if (path.endsWith('.json')) return 'json'
    return 'plaintext'
  }

  const highlightedCode = hljs.highlight(currentContent, {
    language: getLanguage(currentPath),
  }).value

  const handleDownload = async () => {
    const zip = new JSZip()
    for (const file of generatedProject.files) {
      zip.file(file.path, file.content)
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'forgestudio-taro-project.zip'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="forge-editor-panel forge-editor-panel--right">
      <div className="forge-editor-tabs">
        <button
          className={`forge-editor-tab ${rightPanelTab === 'props' ? 'forge-editor-tab--active' : ''}`}
          onClick={() => setRightPanelTab('props')}
        >
          Properties
        </button>
        <button
          className={`forge-editor-tab ${rightPanelTab === 'code' ? 'forge-editor-tab--active' : ''}`}
          onClick={() => setRightPanelTab('code')}
        >
          Code
        </button>
      </div>

      <div className="forge-editor-code-preview">
        <div className="forge-editor-file-tree">
          {generatedProject.files.map((file) => (
            <div
              key={file.path}
              className={`forge-editor-file-item ${currentPath === file.path ? 'forge-editor-file-item--active' : ''}`}
              onClick={() => setActiveFilePath(file.path)}
            >
              {file.path}
            </div>
          ))}
        </div>

        <div className="forge-editor-code-display">
          <div className="forge-editor-code-header">
            <span className="forge-editor-code-filename">{currentPath}</span>
            <button
              className="forge-editor-btn forge-editor-btn--small"
              onClick={handleDownload}
            >
              Download Project
            </button>
          </div>
          <pre className="forge-editor-code-block">
            <code
              className="hljs"
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />
          </pre>
        </div>
      </div>
    </div>
  )
}
