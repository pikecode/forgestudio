import React, { useEffect, useRef, useCallback } from 'react'
import type { WFPSchema } from '@forgestudio/workflow-protocol'
import './styles.css'

export interface WorkflowEditorProps {
  value: WFPSchema
  onChange?: (schema: WFPSchema) => void
  readOnly?: boolean
  height?: number
}

export function WorkflowEditor({
  value,
  onChange: _onChange,
  readOnly = false,
  height = 500,
}: WorkflowEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const lfRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current) return
    // LogicFlow initialization will be added in Task 6 after converter is ready
    // For now, just render a placeholder canvas area
    return () => {
      if (lfRef.current) {
        lfRef.current = null
      }
    }
  }, [])

  // Suppress unused variable warning; readOnly will be used in Task 6
  void readOnly

  const handleFitView = useCallback(() => {
    if (lfRef.current?.fitView) {
      lfRef.current.fitView()
    }
  }, [])

  return (
    <div className="wf-editor" style={{ height }}>
      <div className="wf-editor__toolbar">
        <span className="wf-editor__workflow-name">{value.name}</span>
        <button onClick={handleFitView} className="wf-editor__btn">
          适应画布
        </button>
      </div>
      <div
        ref={containerRef}
        className="wf-editor__canvas"
        style={{ height: height - 36 }}
      />
    </div>
  )
}
