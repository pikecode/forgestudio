import React, { useMemo } from 'react'
import { useEditorStore } from '../store'
import { transformFSPtoIR, renderIRToHTML } from '@forgestudio/codegen-core'

export function PreviewPanel() {
  const schema = useEditorStore((s) => s.schema)
  const currentPageId = useEditorStore((s) => s.currentPageId)
  const rightPanelTab = useEditorStore((s) => s.rightPanelTab)
  const setRightPanelTab = useEditorStore((s) => s.setRightPanelTab)

  const html = useMemo(() => {
    try {
      const irProject = transformFSPtoIR(schema)
      // Find the current page in the IR project
      const currentPage = irProject.pages.find(p => p.id === currentPageId) || irProject.pages[0]
      if (!currentPage) {
        return `<html><body><p style="color:red;padding:16px;">未找到页面</p></body></html>`
      }
      return renderIRToHTML(currentPage)
    } catch (e) {
      return `<html><body><p style="color:red;padding:16px;">渲染失败: ${(e as Error).message}</p></body></html>`
    }
  }, [schema, currentPageId])

  return (
    <div className="forge-editor-panel forge-editor-panel--right forge-editor-panel--preview">
      <div className="forge-editor-tabs">
        <button
          className={`forge-editor-tab ${rightPanelTab === 'props' ? 'forge-editor-tab--active' : ''}`}
          onClick={() => setRightPanelTab('props')}
        >
          属性
        </button>
        <button
          className={`forge-editor-tab ${rightPanelTab === 'datasource' ? 'forge-editor-tab--active' : ''}`}
          onClick={() => setRightPanelTab('datasource')}
        >
          数据源
        </button>
        <button
          className={`forge-editor-tab ${rightPanelTab === 'code' ? 'forge-editor-tab--active' : ''}`}
          onClick={() => setRightPanelTab('code')}
        >
          代码
        </button>
        <button
          className={`forge-editor-tab ${rightPanelTab === 'preview' ? 'forge-editor-tab--active' : ''}`}
          onClick={() => setRightPanelTab('preview')}
        >
          预览
        </button>
      </div>
      <div className="forge-preview-container">
        <div className="forge-preview-phone">
          <iframe
            srcDoc={html}
            className="forge-preview-iframe"
            sandbox="allow-scripts"
            title="预览"
          />
        </div>
      </div>
    </div>
  )
}
