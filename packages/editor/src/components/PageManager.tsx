import { useState } from 'react'
import { useEditorStore } from '../store'

export function PageManager() {
  const { schema, currentPageId, setCurrentPage, addPage, removePage, updatePageMeta } = useEditorStore()
  const updatePageOnLoadWorkflow = useEditorStore(s => s.updatePageOnLoadWorkflow)
  const [isAddingPage, setIsAddingPage] = useState(false)
  const [newPageName, setNewPageName] = useState('')
  const [newPageTitle, setNewPageTitle] = useState('')
  const [editingPageId, setEditingPageId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editWorkflowId, setEditWorkflowId] = useState<string>('')

  const pages = schema.pages || []

  const handleAddPage = () => {
    if (!newPageName.trim() || !newPageTitle.trim()) return
    addPage(newPageName.trim(), newPageTitle.trim())
    setNewPageName('')
    setNewPageTitle('')
    setIsAddingPage(false)
  }

  const handleStartEdit = (pageId: string) => {
    const page = pages.find(p => p.id === pageId)
    if (!page) return
    setEditingPageId(pageId)
    setEditName(page.name)
    setEditTitle(page.title)
    setEditWorkflowId(page.onLoadWorkflow?.workflowId || '')
  }

  const handleSaveEdit = () => {
    if (!editingPageId || !editName.trim() || !editTitle.trim()) return
    updatePageMeta(editingPageId, { name: editName.trim(), title: editTitle.trim() })
    updatePageOnLoadWorkflow(editingPageId, editWorkflowId || undefined)
    setEditingPageId(null)
  }

  const handleCancelEdit = () => {
    setEditingPageId(null)
    setEditName('')
    setEditTitle('')
    setEditWorkflowId('')
  }

  const workflows = schema.workflows || []

  return (
    <div className="page-manager">
      <div className="page-manager-header">
        <h3>页面管理</h3>
        <button
          className="btn-add-page"
          onClick={() => setIsAddingPage(true)}
          disabled={isAddingPage}
        >
          + 新建页面
        </button>
      </div>

      <div className="page-list">
        {pages.map(page => (
          <div
            key={page.id}
            className={`page-item ${currentPageId === page.id ? 'active' : ''}`}
          >
            {editingPageId === page.id ? (
              <div className="page-edit-form">
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="页面名称"
                  className="page-input"
                />
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="页面标题"
                  className="page-input"
                />
                <select
                  value={editWorkflowId}
                  onChange={e => setEditWorkflowId(e.target.value)}
                  className="page-input"
                >
                  <option value="">无页面加载工作流</option>
                  {workflows.map(wf => (
                    <option key={wf.id} value={wf.id}>{wf.name}</option>
                  ))}
                </select>
                <div className="page-edit-actions">
                  <button onClick={handleSaveEdit} className="btn-save">保存</button>
                  <button onClick={handleCancelEdit} className="btn-cancel">取消</button>
                </div>
              </div>
            ) : (
              <>
                <div
                  className="page-info"
                  onClick={() => setCurrentPage(page.id)}
                >
                  <div className="page-title">{page.title}</div>
                  <div className="page-name">{page.name}</div>
                </div>
                <div className="page-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStartEdit(page.id)
                    }}
                    className="btn-edit"
                  >
                    编辑
                  </button>
                  {pages.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`确定删除页面 "${page.title}" 吗？`)) {
                          removePage(page.id)
                        }
                      }}
                      className="btn-delete"
                    >
                      删除
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {isAddingPage && (
        <div className="page-add-form">
          <input
            type="text"
            value={newPageName}
            onChange={e => setNewPageName(e.target.value)}
            placeholder="页面名称 (如: home, detail)"
            className="page-input"
            autoFocus
          />
          <input
            type="text"
            value={newPageTitle}
            onChange={e => setNewPageTitle(e.target.value)}
            placeholder="页面标题 (如: 首页, 详情页)"
            className="page-input"
          />
          <div className="page-add-actions">
            <button onClick={handleAddPage} className="btn-save">创建</button>
            <button onClick={() => {
              setIsAddingPage(false)
              setNewPageName('')
              setNewPageTitle('')
            }} className="btn-cancel">取消</button>
          </div>
        </div>
      )}
    </div>
  )
}
