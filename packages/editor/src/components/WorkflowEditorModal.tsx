import React, { useState, useEffect } from 'react'
import { useEditorStore } from '../store'
import type { WFPSchema } from '@forgestudio/workflow-protocol'
import { createWorkflow } from '@forgestudio/workflow-protocol'

// Lazy import WorkflowEditor to avoid loading LogicFlow unless needed
const WorkflowEditorLazy = React.lazy(() =>
  import('@forgestudio/workflow-editor').then(m => ({ default: m.WorkflowEditor }))
)

export function WorkflowEditorModal() {
  const activeWorkflowId = useEditorStore(s => s.activeWorkflowId)
  const schema = useEditorStore(s => s.schema)
  const openWorkflowEditor = useEditorStore(s => s.openWorkflowEditor)
  const saveWorkflow = useEditorStore(s => s.saveWorkflow)

  const [localWorkflow, setLocalWorkflow] = useState<WFPSchema | null>(null)

  // Initialize localWorkflow when the modal opens or activeWorkflowId changes
  useEffect(() => {
    if (!activeWorkflowId) {
      setLocalWorkflow(null)
      return
    }
    const existingRef = schema.workflows?.find(w => w.id === activeWorkflowId)
    const initial = (existingRef?.inline as WFPSchema | undefined)
      ?? { ...createWorkflow('新流程', 'interaction'), id: activeWorkflowId }
    setLocalWorkflow(initial)
  }, [activeWorkflowId]) // intentionally omitting schema to avoid re-init on every schema change

  if (!activeWorkflowId || !localWorkflow) return null

  const handleSave = () => {
    saveWorkflow(localWorkflow)
    setLocalWorkflow(null)
    openWorkflowEditor(null)
  }

  const handleCancel = () => {
    setLocalWorkflow(null)
    openWorkflowEditor(null)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 8, padding: 20,
        width: '80vw', maxWidth: 1000,
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>流程编辑器 — {localWorkflow.name}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSave}
              style={{ padding: '6px 16px', background: '#1890ff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
            >
              保存流程
            </button>
            <button
              onClick={handleCancel}
              style={{ padding: '6px 16px', background: '#fff', border: '1px solid #d0d0d0', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
            >
              取消
            </button>
          </div>
        </div>
        <React.Suspense fallback={<div style={{ height: 560, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>加载流程编辑器...</div>}>
          <WorkflowEditorLazy value={localWorkflow} onChange={setLocalWorkflow} height={560} />
        </React.Suspense>
      </div>
    </div>
  )
}
