import React, { useEffect, useRef, useCallback } from 'react'
import type { WFPSchema } from '@forgestudio/workflow-protocol'
import { wfpToLogicFlow, logicFlowToWfp } from './converter'
import { registerCustomNodes } from './nodes'
import './styles.css'

export interface WorkflowEditorProps {
  value: WFPSchema
  onChange?: (schema: WFPSchema) => void
  readOnly?: boolean
  height?: number
}

export function WorkflowEditor({
  value,
  onChange,
  readOnly = false,
  height = 500,
}: WorkflowEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const lfRef = useRef<any>(null)
  // Keep a stable ref to the latest value/onChange so the effect closure
  // does not need to re-run when they change.
  const valueRef = useRef<WFPSchema>(value)
  valueRef.current = value
  const onChangeRef = useRef<((s: WFPSchema) => void) | undefined>(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!containerRef.current) return

    let lf: any

    const init = async () => {
      const mod = await import('@logicflow/core')
      // LF v2 is a named export *and* a default export depending on bundler.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const LogicFlowClass: any = (mod as any).LogicFlow ?? (mod as any).default

      lf = new LogicFlowClass({
        container: containerRef.current!,
        grid: true,
        isSilentMode: readOnly,
      })

      registerCustomNodes(lf)
      lf.render(wfpToLogicFlow(valueRef.current))
      lfRef.current = lf

      if (!readOnly) {
        const handleChange = () => {
          const cb = onChangeRef.current
          if (!cb) return
          const graphData = lf.getGraphData()
          const updated = logicFlowToWfp(graphData, valueRef.current)
          cb(updated)
        }

        lf.on('node:dnd-add', handleChange)
        lf.on('edge:add', handleChange)
        lf.on('node:delete', handleChange)
        lf.on('edge:delete', handleChange)
        lf.on('node:drag', handleChange)
        lf.on('node:drop', handleChange)
      }
    }

    init().catch((err: unknown) => {
      throw new Error(
        `WorkflowEditor: failed to initialise LogicFlow — ${String(err)}`,
      )
    })

    return () => {
      if (lfRef.current?.destroy) {
        lfRef.current.destroy()
      }
      lfRef.current = null
    }
    // We intentionally run this effect only once on mount.  The `readOnly`
    // flag is part of the effect (captured at init time) so a change requires
    // a remount (achieved by the consumer keying on readOnly if desired).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
