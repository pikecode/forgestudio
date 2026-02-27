import React from 'react'
import { useEditorStore } from '../store'
import { createWorkflow } from '@forgestudio/workflow-protocol'
import type { WFPSchema } from '@forgestudio/workflow-protocol'

export function WorkflowListPanel() {
  const showWorkflowPanel = useEditorStore(s => s.showWorkflowPanel)
  const setShowWorkflowPanel = useEditorStore(s => s.setShowWorkflowPanel)
  const schema = useEditorStore(s => s.schema)
  const openWorkflowEditor = useEditorStore(s => s.openWorkflowEditor)
  const saveWorkflow = useEditorStore(s => s.saveWorkflow)

  if (!showWorkflowPanel) return null

  const workflows = schema.workflows ?? []

  const handleNew = () => {
    const wf = createWorkflow('新流程', 'interaction')
    saveWorkflow(wf as unknown as WFPSchema)
    openWorkflowEditor(wf.id)
    setShowWorkflowPanel(false)
  }

  const handleEdit = (id: string) => {
    openWorkflowEditor(id)
    setShowWorkflowPanel(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={() => setShowWorkflowPanel(false)}>
      <div style={{
        background: '#fff', borderRadius: 8, padding: 24,
        width: 480, maxHeight: '70vh',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column', gap: 16,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>流程管理</span>
          <button
            onClick={handleNew}
            style={{ padding: '6px 14px', background: '#1890ff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
          >
            + 新建流程
          </button>
        </div>

        {workflows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999', fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⬡</div>
            <div>还没有流程</div>
            <div style={{ marginTop: 4, fontSize: 12 }}>点击「新建流程」创建第一个工作流</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
            {workflows.map(wf => (
              <div key={wf.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', border: '1px solid #e8e8e8', borderRadius: 6,
                background: '#fafafa',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{wf.name}</div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                    {wf.type === 'interaction' ? '交互流程' : wf.type === 'data-orchestration' ? '数据编排' : '审批流程'}
                    {' · '}ID: {wf.id}
                  </div>
                </div>
                <button
                  onClick={() => handleEdit(wf.id)}
                  style={{ padding: '4px 12px', background: '#fff', border: '1px solid #1890ff', color: '#1890ff', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                >
                  编辑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
